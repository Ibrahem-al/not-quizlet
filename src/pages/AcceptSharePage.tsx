import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Folder,
  BookOpen,
  Share2,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useSharingStore } from '../stores/sharingStore';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../hooks/useTranslation';
import { Button } from '../components/ui/Button';
import { AppLayout } from '../components/layout/AppLayout';

export default function AcceptSharePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { acceptShareLink, isLoading, error } = useSharingStore();

  const [shareData, setShareData] = useState<{
    itemType: 'set' | 'folder';
    itemId: string;
  } | null>(null);

  useEffect(() => {
    if (token && user) {
      acceptShareLink(token).then((data) => {
        if (data) {
          setShareData(data);
        }
      });
    }
  }, [token, user, acceptShareLink]);

  const handleViewItem = () => {
    if (!shareData) return;

    if (shareData.itemType === 'set') {
      navigate(`/sets/${shareData.itemId}`);
    } else {
      navigate(`/folders/${shareData.itemId}`);
    }
  };

  // Not signed in
  if (!user) {
    return (
      <AppLayout>
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-[var(--color-primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {t('signInRequired')}
            </h1>
            <p className="text-[var(--color-text-secondary)] mb-6">
              {t('signInToAccessSharedItem')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={`/signin?redirect=/share/${token}`}>
                <Button size="lg">{t('signIn')}</Button>
              </Link>
              <Link to="/">
                <Button variant="outline" size="lg">
                  {t('goHome')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
            <p className="text-[var(--color-text-secondary)]">{t('validatingLink')}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error
  if (error || !shareData) {
    return (
      <AppLayout>
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {t('invalidLink')}
            </h1>
            <p className="text-[var(--color-text-secondary)] mb-6">
              {error || t('linkExpiredOrRevoked')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/">
                <Button>{t('goHome')}</Button>
              </Link>
              <Link to="/explore">
                <Button variant="outline">{t('explore')}</Button>
              </Link>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Success - Link accepted
  return (
    <AppLayout>
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>

          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            {t('shareAccepted')}
          </h1>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                {shareData.itemType === 'set' ? (
                  <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
                ) : (
                  <Folder className="w-5 h-5 text-[var(--color-primary)]" />
                )}
              </div>
              <div className="text-left">
                <p className="font-medium text-[var(--color-text-primary)]">
                  {shareData.itemType === 'set' ? t('studySet') : t('folder')}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t('addedToYourLibrary')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleViewItem} size="lg">
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('viewItem')}
            </Button>
            <Link to="/shared">
              <Button variant="outline" size="lg">
                <Share2 className="w-4 h-4 mr-2" />
                {t('viewAllShared')}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
