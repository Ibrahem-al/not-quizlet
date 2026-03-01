/**
 * TipTap extensions for Studio Mode editor.
 */

import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';

export function getEditorExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      hardBreak: false,
    }),
    Placeholder.configure({ placeholder }),
    Image.configure({ inline: false }),
    Highlight.configure({ multicolor: false }),
  ];
}
