import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { buildQuestions, calculatePoints, generatePlayerToken, savePlayerSession, clearPlayerSession } from '../lib/liveGameUtils';
import { hasContent, hasTermContent, hasDefinitionContent } from '../lib/validation';
import type { StudySet } from '../types';
import type {
  GameStatus,
  LiveQuestion,
  PlayerEntry,
  ReceivedAnswer,
  QuestionShowPayload,
  AnswerRevealPayload,
  LeaderboardPayload,
  PlayerAnswerPayload,
  FinishedPayload,
  TimerSyncPayload,
  NextQuestionPayload,
} from '../types/liveGame';

interface LiveGameState {
  sessionId: string | null;
  gameCode: string | null;
  hostUserId: string | null;
  isHost: boolean;
  status: GameStatus;
  questions: LiveQuestion[];
  currentQuestionIndex: number;
  currentQuestion: Omit<LiveQuestion, 'correctOptionIndex' | 'correctOptionIndices'> | null;
  correctOptionIndex: number | null;
  correctOptionIndices: number[] | null;
  playerToken: string | null;
  nickname: string | null;
  players: PlayerEntry[];
  myAnswer: { chosenOption: number; timeTakenMs: number } | null;
  questionStartedAt: number | null;
  receivedAnswers: ReceivedAnswer[];
  timerRemainingMs: number;
  error: string | null;
  isLoading: boolean;
  // Internal - not exposed
  _channel: ReturnType<NonNullable<typeof supabase>['channel']> | null;
  _timerInterval: ReturnType<typeof setInterval> | null;
  _timerSyncInterval: ReturnType<typeof setInterval> | null;
}

interface LiveGameActions {
  createSession: (set: StudySet) => Promise<string | null>;
  startGame: () => Promise<void>;
  showQuestion: (questionIndex: number) => void;
  revealAnswer: () => Promise<void>;
  showLeaderboard: () => void;
  advanceToNext: () => void;
  endGame: () => Promise<void>;
  joinSession: (gameCode: string, nickname: string) => Promise<boolean>;
  submitAnswer: (chosenOption: number) => Promise<void>;
  leaveSession: () => void;
  reset: () => void;
  _onPlayerAnswer: (payload: PlayerAnswerPayload) => void;
  _onQuestionShow: (payload: QuestionShowPayload) => void;
  _onAnswerReveal: (payload: AnswerRevealPayload) => void;
  _onLeaderboard: (payload: LeaderboardPayload) => void;
  _onGameFinished: (payload: FinishedPayload) => void;
}

const initialState: LiveGameState = {
  sessionId: null,
  gameCode: null,
  hostUserId: null,
  isHost: false,
  status: 'idle',
  questions: [],
  currentQuestionIndex: 0,
  currentQuestion: null,
  correctOptionIndex: null,
  correctOptionIndices: null,
  playerToken: null,
  nickname: null,
  players: [],
  myAnswer: null,
  questionStartedAt: null,
  receivedAnswers: [],
  timerRemainingMs: 15000,
  error: null,
  isLoading: false,
  _channel: null,
  _timerInterval: null,
  _timerSyncInterval: null,
};

export const useLiveGameStore = create<LiveGameState & LiveGameActions>((set, get) => ({
  ...initialState,

  createSession: async (studySet: StudySet): Promise<string | null> => {
    if (!supabase) {
      set({ error: 'Supabase is not configured.' });
      return null;
    }
    set({ isLoading: true, error: null });

    try {
      // Generate game code via DB function
      const { data: codeData, error: codeError } = await supabase.rpc('generate_game_code');
      if (codeError || !codeData) throw codeError ?? new Error('Failed to generate game code');

      const gameCode: string = codeData;
      const usableCards = studySet.cards.filter(
        (c) => hasContent(c) && hasTermContent(c) && hasDefinitionContent(c)
      );
      const questions = buildQuestions(usableCards);
      const snapshot = usableCards.map(({ id, term, definition, imageData }) => ({ id, term, definition, imageData }));

      const { data, error } = await supabase
        .from('live_game_sessions')
        .insert({
          game_code: gameCode,
          host_user_id: studySet.userId,
          set_id: studySet.id,
          set_snapshot: snapshot,
          question_count: questions.length,
          status: 'lobby',
        })
        .select('id')
        .single();

      if (error || !data) throw error ?? new Error('Failed to create session');

      const sessionId: string = data.id;
      const hostPlayerToken = generatePlayerToken();

      // Insert host as participant
      await supabase.from('live_game_participants').insert({
        session_id: sessionId,
        nickname: 'Host',
        player_token: hostPlayerToken,
        is_host: true,
      });

      // Set up Realtime channel
      const channel = supabase.channel(`live-game:${gameCode}`, {
        config: { presence: { key: hostPlayerToken } },
      });

      channel
        .on('broadcast', { event: 'player:answer' }, ({ payload }: { payload: PlayerAnswerPayload }) => {
          get()._onPlayerAnswer(payload);
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState<{ nickname: string; score: number; streak: number; isHost?: boolean }>();
          const players: PlayerEntry[] = Object.entries(presenceState).map(([token, metas]) => {
            const meta = Array.isArray(metas) ? metas[0] : metas;
            return {
              playerToken: token,
              nickname: meta?.nickname ?? 'Unknown',
              score: meta?.score ?? 0,
              streak: meta?.streak ?? 0,
              isOnline: true,
            };
          });
          set({ players });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ nickname: 'Host', score: 0, streak: 0, isHost: true });
          }
        });

      set({
        sessionId,
        gameCode,
        isHost: true,
        status: 'lobby',
        questions,
        playerToken: hostPlayerToken,
        nickname: 'Host',
        isLoading: false,
        _channel: channel,
      });

      return sessionId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  startGame: async () => {
    const { sessionId, _channel } = get();
    if (!supabase || !sessionId || !_channel) return;

    await supabase
      .from('live_game_sessions')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', sessionId);

    set({ status: 'question', currentQuestionIndex: 0 });
    get().showQuestion(0);
  },

  showQuestion: (questionIndex: number) => {
    const { questions, _channel } = get();
    const question = questions[questionIndex];
    if (!question || !_channel) return;

    // Clear any existing timer
    const { _timerInterval, _timerSyncInterval } = get();
    if (_timerInterval) clearInterval(_timerInterval);
    if (_timerSyncInterval) clearInterval(_timerSyncInterval);

    const now = Date.now();
    const timeLimitMs = question.timeLimitMs;

    // Send question to all players (without correctOptionIndex)
    const payload: QuestionShowPayload = {
      questionIndex,
      term: question.term,
      imageData: question.imageData,
      options: question.options,
      timeLimitMs,
      hostTimestamp: now,
    };
    _channel.send({ type: 'broadcast', event: 'game:question_show', payload });

    // Start host timer
    let remaining = timeLimitMs;
    const timerInterval = setInterval(() => {
      remaining -= 100;
      set({ timerRemainingMs: remaining });
      if (remaining <= 0) {
        clearInterval(timerInterval);
        clearInterval(syncInterval);
      }
    }, 100);

    // Sync timer to players every 2s
    const syncInterval = setInterval(() => {
      const rem = get().timerRemainingMs;
      if (rem > 0) {
        const syncPayload: TimerSyncPayload = { remainingMs: rem, questionIndex };
        _channel.send({ type: 'broadcast', event: 'game:timer_sync', payload: syncPayload });
      }
    }, 2000);

    set({
      status: 'question',
      currentQuestionIndex: questionIndex,
      currentQuestion: {
        questionIndex: question.questionIndex,
        term: question.term,
        imageData: question.imageData,
        options: question.options,
        timeLimitMs,
      },
      receivedAnswers: [],
      myAnswer: null,
      questionStartedAt: now,
      timerRemainingMs: timeLimitMs,
      _timerInterval: timerInterval,
      _timerSyncInterval: syncInterval,
    });

    // Update DB question index
    const { sessionId } = get();
    if (supabase && sessionId) {
      supabase
        .from('live_game_sessions')
        .update({ current_question_index: questionIndex })
        .eq('id', sessionId)
        .then(() => {});
    }
  },

  revealAnswer: async () => {
    const { questions, currentQuestionIndex, receivedAnswers, players, _channel, sessionId, _timerInterval, _timerSyncInterval } = get();
    if (!_channel) return;

    if (_timerInterval) clearInterval(_timerInterval);
    if (_timerSyncInterval) clearInterval(_timerSyncInterval);

    const question = questions[currentQuestionIndex];
    if (!question) return;

    // Build per-player results map
    const perPlayer: AnswerRevealPayload['perPlayer'] = {};
    const updatedPlayers = players.map((p) => {
      if (p.isOnline && !p.nickname.startsWith('Host')) {
        const answer = receivedAnswers.find((a) => a.playerToken === p.playerToken);
        if (answer) {
          perPlayer[p.playerToken] = {
            chosenOption: answer.chosenOption,
            isCorrect: answer.isCorrect,
            pointsEarned: answer.pointsEarned,
          };
          return { ...p, score: p.score + answer.pointsEarned, streak: answer.isCorrect ? p.streak + 1 : 0 };
        } else {
          perPlayer[p.playerToken] = { chosenOption: -1, isCorrect: false, pointsEarned: 0 };
          return { ...p, streak: 0 };
        }
      }
      return p;
    });

    const payload: AnswerRevealPayload = {
      correctOptionIndex: question.correctOptionIndex,
      correctOptionIndices: question.correctOptionIndices,
      perPlayer,
    };
    _channel.send({ type: 'broadcast', event: 'game:answer_reveal', payload });

    // Persist answers to DB
    if (supabase && sessionId) {
      const answerRows = receivedAnswers.map((a) => {
        const participant = players.find((p) => p.playerToken === a.playerToken);
        return {
          session_id: sessionId,
          participant_id: participant?.playerToken ?? a.playerToken,
          question_index: currentQuestionIndex,
          chosen_option: a.chosenOption,
          is_correct: a.isCorrect,
          time_taken_ms: a.timeTakenMs,
          points_earned: a.pointsEarned,
        };
      });
      if (answerRows.length > 0) {
        supabase.from('live_game_answers').upsert(answerRows).then(() => {});
      }
    }

    set({ status: 'reveal', players: updatedPlayers, correctOptionIndex: question.correctOptionIndex, correctOptionIndices: question.correctOptionIndices });
  },

  showLeaderboard: () => {
    const { players, questions, currentQuestionIndex, _channel } = get();
    if (!_channel) return;

    const rankings = [...players]
      .filter((p) => !p.isOnline || p.nickname !== 'Host')
      .sort((a, b) => b.score - a.score)
      .map(({ playerToken, nickname, score, streak }) => ({ playerToken, nickname, score, streak }));

    const payload: LeaderboardPayload = {
      rankings,
      questionIndex: currentQuestionIndex,
      totalQuestions: questions.length,
    };
    _channel.send({ type: 'broadcast', event: 'game:leaderboard', payload });
    set({ status: 'leaderboard' });
  },

  advanceToNext: () => {
    const { currentQuestionIndex, questions } = get();
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= questions.length) {
      get().endGame();
    } else {
      get().showQuestion(nextIndex);
    }
  },

  endGame: async () => {
    const { players, sessionId, _channel } = get();
    if (!_channel) return;

    const finalRankings = [...players]
      .filter((p) => p.nickname !== 'Host')
      .sort((a, b) => b.score - a.score)
      .map(({ playerToken, nickname, score }) => ({ playerToken, nickname, score }));

    const payload: FinishedPayload = { finalRankings };
    _channel.send({ type: 'broadcast', event: 'game:finished', payload });

    if (supabase && sessionId) {
      await supabase
        .from('live_game_sessions')
        .update({ status: 'finished', finished_at: new Date().toISOString() })
        .eq('id', sessionId);
    }

    set({ status: 'finished' });
  },

  joinSession: async (gameCode: string, nickname: string): Promise<boolean> => {
    if (!supabase) {
      set({ error: 'Supabase is not configured.' });
      return false;
    }
    set({ isLoading: true, error: null });

    try {
      // Look up session
      const { data: session, error: sessionError } = await supabase
        .from('live_game_sessions')
        .select('id, status, question_count')
        .eq('game_code', gameCode)
        .in('status', ['lobby', 'active'])
        .single();

      if (sessionError || !session) {
        set({ error: 'Game not found or already ended.', isLoading: false });
        return false;
      }

      const playerToken = generatePlayerToken();
      savePlayerSession(gameCode, nickname);

      // Insert participant
      const { error: participantError } = await supabase
        .from('live_game_participants')
        .upsert({ session_id: session.id, nickname, player_token: playerToken, is_host: false }, { onConflict: 'player_token' });

      if (participantError) {
        set({ error: 'Failed to join game.', isLoading: false });
        return false;
      }

      // Set up Realtime channel
      const channel = supabase.channel(`live-game:${gameCode}`, {
        config: { presence: { key: playerToken } },
      });

      channel
        .on('broadcast', { event: 'game:question_show' }, ({ payload }: { payload: QuestionShowPayload }) => {
          get()._onQuestionShow(payload);
        })
        .on('broadcast', { event: 'game:timer_sync' }, ({ payload }: { payload: TimerSyncPayload }) => {
          if (payload.questionIndex === get().currentQuestionIndex) {
            set({ timerRemainingMs: payload.remainingMs });
          }
        })
        .on('broadcast', { event: 'game:answer_reveal' }, ({ payload }: { payload: AnswerRevealPayload }) => {
          get()._onAnswerReveal(payload);
        })
        .on('broadcast', { event: 'game:leaderboard' }, ({ payload }: { payload: LeaderboardPayload }) => {
          get()._onLeaderboard(payload);
        })
        .on('broadcast', { event: 'game:next_question' }, ({ payload }: { payload: NextQuestionPayload }) => {
          set({ currentQuestionIndex: payload.questionIndex, status: 'question' });
        })
        .on('broadcast', { event: 'game:finished' }, ({ payload }: { payload: FinishedPayload }) => {
          get()._onGameFinished(payload);
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState<{ nickname: string; score: number; streak: number }>();
          const players: PlayerEntry[] = Object.entries(presenceState).map(([token, metas]) => {
            const meta = Array.isArray(metas) ? metas[0] : metas;
            return {
              playerToken: token,
              nickname: meta?.nickname ?? 'Unknown',
              score: meta?.score ?? 0,
              streak: meta?.streak ?? 0,
              isOnline: true,
            };
          });
          set({ players });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ nickname, score: 0, streak: 0 });
          }
        });

      set({
        sessionId: session.id,
        gameCode,
        isHost: false,
        status: session.status === 'active' ? 'question' : 'lobby',
        playerToken,
        nickname,
        isLoading: false,
        _channel: channel,
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  submitAnswer: async (chosenOption: number) => {
    const { playerToken, questionStartedAt, currentQuestionIndex, currentQuestion, _channel, sessionId } = get();
    if (!playerToken || !_channel || !currentQuestion) return;

    const timeTakenMs = questionStartedAt ? Date.now() - questionStartedAt : currentQuestion.timeLimitMs;
    const payload: PlayerAnswerPayload = { playerToken, questionIndex: currentQuestionIndex, chosenOption, timeTakenMs };

    // Broadcast answer to host
    _channel.send({ type: 'broadcast', event: 'player:answer', payload });

    // Also write to DB as reliability fallback
    if (supabase && sessionId) {
      supabase
        .from('live_game_answers')
        .upsert({
          session_id: sessionId,
          participant_id: playerToken,
          question_index: currentQuestionIndex,
          chosen_option: chosenOption,
          is_correct: false,  // host will correct this
          time_taken_ms: timeTakenMs,
          points_earned: 0,
        }, { onConflict: 'session_id,participant_id,question_index' })
        .then(() => {});
    }

    set({ myAnswer: { chosenOption, timeTakenMs } });
  },

  leaveSession: () => {
    const { _channel, _timerInterval, _timerSyncInterval } = get();
    if (_timerInterval) clearInterval(_timerInterval);
    if (_timerSyncInterval) clearInterval(_timerSyncInterval);
    if (_channel) {
      _channel.unsubscribe();
      supabase?.removeChannel(_channel);
    }
    clearPlayerSession();
    set({ ...initialState });
  },

  reset: () => {
    const { _channel, _timerInterval, _timerSyncInterval } = get();
    if (_timerInterval) clearInterval(_timerInterval);
    if (_timerSyncInterval) clearInterval(_timerSyncInterval);
    if (_channel) {
      _channel.unsubscribe();
      supabase?.removeChannel(_channel);
    }
    set({ ...initialState });
  },

  // Internal event handlers (called by channel subscriptions)
  _onQuestionShow: (payload: QuestionShowPayload) => {
    const skew = Date.now() - payload.hostTimestamp;
    const adjustedRemaining = Math.max(0, payload.timeLimitMs - skew);

    // Player-side local countdown
    const { _timerInterval } = get();
    if (_timerInterval) clearInterval(_timerInterval);

    let remaining = adjustedRemaining;
    const timerInterval = setInterval(() => {
      remaining -= 100;
      set({ timerRemainingMs: remaining });
      if (remaining <= 0) clearInterval(timerInterval);
    }, 100);

    set({
      status: 'question',
      currentQuestionIndex: payload.questionIndex,
      currentQuestion: {
        questionIndex: payload.questionIndex,
        term: payload.term,
        imageData: payload.imageData,
        options: payload.options,
        timeLimitMs: payload.timeLimitMs,
      },
      myAnswer: null,
      questionStartedAt: Date.now(),
      timerRemainingMs: adjustedRemaining,
      correctOptionIndex: null,
      correctOptionIndices: null,
      _timerInterval: timerInterval,
    });
  },

  _onAnswerReveal: (payload: AnswerRevealPayload) => {
    const { playerToken, players } = get();
    const myResult = playerToken ? payload.perPlayer[playerToken] : null;

    // Update player scores
    const updatedPlayers = players.map((p) => {
      const result = payload.perPlayer[p.playerToken];
      if (result) {
        return { ...p, score: p.score + result.pointsEarned, streak: result.isCorrect ? p.streak + 1 : 0 };
      }
      return p;
    });

    set({
      status: 'reveal',
      correctOptionIndex: payload.correctOptionIndex,
      correctOptionIndices: payload.correctOptionIndices ?? [payload.correctOptionIndex],
      players: updatedPlayers,
      myAnswer: myResult
        ? { chosenOption: myResult.chosenOption, timeTakenMs: 0 }
        : get().myAnswer,
    });
  },

  _onLeaderboard: (payload: LeaderboardPayload) => {
    const updatedPlayers = payload.rankings.map((r) => ({
      playerToken: r.playerToken,
      nickname: r.nickname,
      score: r.score,
      streak: r.streak,
      isOnline: true,
    }));
    set({ status: 'leaderboard', players: updatedPlayers });
  },

  _onPlayerAnswer: (payload: PlayerAnswerPayload) => {
    const { currentQuestionIndex, questions, players } = get();
    // Ignore stale answers
    if (payload.questionIndex !== currentQuestionIndex) return;
    // Ignore duplicates
    if (get().receivedAnswers.some((a) => a.playerToken === payload.playerToken)) return;

    const question = questions[currentQuestionIndex];
    if (!question) return;

    const isCorrect = question.correctOptionIndices.includes(payload.chosenOption);
    const player = players.find((p) => p.playerToken === payload.playerToken);
    const { points } = calculatePoints(isCorrect, payload.timeTakenMs, question.timeLimitMs, player?.streak ?? 0);

    const answer: ReceivedAnswer = {
      playerToken: payload.playerToken,
      chosenOption: payload.chosenOption,
      timeTakenMs: payload.timeTakenMs,
      isCorrect,
      pointsEarned: points,
    };

    set((state) => ({ receivedAnswers: [...state.receivedAnswers, answer] }));
  },

  _onGameFinished: (payload: FinishedPayload) => {
    const updatedPlayers = payload.finalRankings.map((r) => ({
      playerToken: r.playerToken,
      nickname: r.nickname,
      score: r.score,
      streak: 0,
      isOnline: true,
    }));
    set({ status: 'finished', players: updatedPlayers });
  },
}));
