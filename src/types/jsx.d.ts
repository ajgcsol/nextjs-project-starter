import type { ComponentProps, JSX as ReactJSX } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // HTML elements
      div: ComponentProps<'div'>;
      span: ComponentProps<'span'>;
      p: ComponentProps<'p'>;
      h1: ComponentProps<'h1'>;
      h2: ComponentProps<'h2'>;
      h3: ComponentProps<'h3'>;
      h4: ComponentProps<'h4'>;
      h5: ComponentProps<'h5'>;
      h6: ComponentProps<'h6'>;
      a: ComponentProps<'a'>;
      button: ComponentProps<'button'>;
      input: ComponentProps<'input'>;
      textarea: ComponentProps<'textarea'>;
      select: ComponentProps<'select'>;
      option: ComponentProps<'option'>;
      img: ComponentProps<'img'>;
      video: ComponentProps<'video'>;
      canvas: ComponentProps<'canvas'>;
      form: ComponentProps<'form'>;
      ul: ComponentProps<'ul'>;
      ol: ComponentProps<'ol'>;
      li: ComponentProps<'li'>;
      nav: ComponentProps<'nav'>;
      main: ComponentProps<'main'>;
      section: ComponentProps<'section'>;
      article: ComponentProps<'article'>;
      header: ComponentProps<'header'>;
      footer: ComponentProps<'footer'>;
      aside: ComponentProps<'aside'>;
      table: ComponentProps<'table'>;
      thead: ComponentProps<'thead'>;
      tbody: ComponentProps<'tbody'>;
      tr: ComponentProps<'tr'>;
      th: ComponentProps<'th'>;
      td: ComponentProps<'td'>;
      label: ComponentProps<'label'>;
    }
  }
}