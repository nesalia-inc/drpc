'use client';

import { Accordions, Accordion } from 'fumadocs-ui/components/accordion';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <Accordions type="single">
      {items.map((item, index) => (
        <Accordion key={index} title={item.question}>
          {item.answer}
        </Accordion>
      ))}
    </Accordions>
  );
}
