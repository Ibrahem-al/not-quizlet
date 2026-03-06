/**
 * TipTap extensions for Studio Mode editor.
 */

import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

/**
 * Custom extension to handle image paste events.
 * Converts pasted image files to base64 and inserts them.
 */
const ImagePasteHandler = Extension.create({
  name: 'imagePasteHandler',

  addProseMirrorPlugins() {
    const pastePlugin = new Plugin({
      key: new PluginKey('imagePasteHandler'),
      props: {
        handlePaste: (view, event) => {
          const items = event.clipboardData?.items;
          if (!items) return false;

          const imageItems = Array.from(items).filter(
            (item) => item.type.startsWith('image/')
          );

          if (imageItems.length === 0) return false;

          event.preventDefault();

          imageItems.forEach((item) => {
            const blob = item.getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target?.result as string;
                if (base64) {
                  const { state } = view;
                  const { selection } = state;
                  const { from } = selection;
                  const node = state.schema.nodes.image.create({
                    src: base64,
                    alt: '',
                  });
                  const tr = state.tr.insert(from, node);
                  view.dispatch(tr);
                }
              };
              reader.readAsDataURL(blob);
            }
          });

          return true;
        },
      },
    });

    return [pastePlugin];
  },
});

export function getEditorExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      hardBreak: false,
    }),
    Placeholder.configure({ placeholder }),
    Image.configure({ inline: false, allowBase64: true }),
    Highlight.configure({ multicolor: false }),
    ImagePasteHandler,
  ];
}
