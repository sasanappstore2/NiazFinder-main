'use client';

import { Bookmark, Search } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageChrome } from '@/components/layout/PageChrome';
import { EmptyState } from '@/components/shared/EmptyState';
import { PanelCard } from '@/components/shared/PanelCard';
import { FieldStack } from '@/components/shared/FieldStack';
import { OptionGroup } from '@/components/shared/OptionGroup';
import { OptionTile } from '@/components/shared/OptionTile';
import { BorderGlow } from '@/components/ui/border-glow';
import { Spotlight } from '@/components/ui/spotlight';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SITE_LABELS } from '@/config/site-labels';
import { useState } from 'react';

function BorderGlowSpotlightDemo() {
  return (
    <div className="relative aspect-video h-[200px] max-w-md overflow-hidden rounded-xl bg-zinc-300/30 p-px dark:bg-zinc-700/30">
      <Spotlight
        className="from-blue-600 via-blue-500 to-blue-400 blur-3xl dark:from-blue-200 dark:via-blue-300 dark:to-blue-400"
        size={124}
      />
      <div className="relative h-full w-full rounded-xl bg-background" />
    </div>
  );
}

export default function UiKitDevPage() {
  const [selectedOption, setSelectedOption] = useState('a');

  return (
    <PageContainer width="content" className="space-y-8 pb-16">
      <PageChrome
        title="UI Kit (dev)"
        description="Preview of shared layout primitives from docs/UI_ORDER_SYSTEM.md"
      />

      <section className="space-y-4">
        <h2 className="text-h3 font-semibold">BorderGlow + Spotlight</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <BorderGlowSpotlightDemo />
          <PanelCard glow title="PanelCard glow">
            <p className="text-sm text-muted-foreground">
              پنل با حاشیه درخشان و spotlight هنگام hover.
            </p>
          </PanelCard>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-h3 font-semibold">PageChrome</h2>
        <PanelCard>
          <PageChrome title={SITE_LABELS.bookmarks} description="Breadcrumb + separator + H1 pattern" />
        </PanelCard>
      </section>

      <section className="space-y-4">
        <h2 className="text-h3 font-semibold">EmptyState</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <EmptyState icon={Search} title="Default" description="Standard empty message." />
          <EmptyState icon={Bookmark} variant="filtered" title="Filtered" description="No items in filter." />
          <EmptyState
            icon={Search}
            variant="error"
            title="Error"
            description="Something went wrong."
            actionLabel="Retry"
            onAction={() => {}}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-h3 font-semibold">FieldStack</h2>
        <PanelCard className="max-w-md space-y-6">
          <FieldStack label="نام (plain)" htmlFor="ui-kit-name" description="نام نمایشی شما">
            <Input id="ui-kit-name" placeholder="مثلاً sasan" />
          </FieldStack>
          <FieldStack label="نام (bordered + glow)" htmlFor="ui-kit-name-glow" variant="bordered">
            <Input id="ui-kit-name-glow" placeholder="با حاشیه spotlight" className="border-0 shadow-none" />
          </FieldStack>
        </PanelCard>
      </section>

      <section className="space-y-4">
        <h2 className="text-h3 font-semibold">OptionGroup</h2>
        <PanelCard className="max-w-md">
          <OptionGroup layout="stack" label="OptionTile (stack + glow)">
            <OptionTile
              selected={selectedOption === 'a'}
              onClick={() => setSelectedOption('a')}
            >
              گزینه ۱
            </OptionTile>
            <OptionTile
              selected={selectedOption === 'b'}
              onClick={() => setSelectedOption('b')}
            >
              گزینه ۲
            </OptionTile>
          </OptionGroup>
          <OptionGroup layout="chips" label="Chips layout" className="mt-6">
            <Button size="sm" variant="secondary">
              همه
            </Button>
            <Button size="sm" variant="outline">
              فعال
            </Button>
            <Button size="sm" variant="outline">
              غیرفعال
            </Button>
          </OptionGroup>
        </PanelCard>
      </section>
    </PageContainer>
  );
}
