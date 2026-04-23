import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { docsBaseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...docsBaseOptions()}
      tabs={[
        {
          title: 'Framework',
          description: 'Core RPC framework documentation',
          url: '/docs/getting-started',
        },
        {
          title: 'Electron',
          description: 'Electron integration documentation',
          url: '/docs/electron',
        },
      ]}
    >
      {children}
    </DocsLayout>
  );
}
