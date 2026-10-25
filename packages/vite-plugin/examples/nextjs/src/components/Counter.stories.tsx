import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';

import { Counter } from './Counter';

type Story = StoryObj<typeof META>;

const META = {
  title: 'Example/Counter',
  component: Counter,
  args: {
    label: 'Story counter',
    initialCount: 0,
  },
} satisfies Meta<typeof Counter>;

export default META;

export const Default: Story = {};

export const OnAbout: Story = {
  args: { initialCount: 7 },
  parameters: {
    nextjs: { navigation: { pathname: '/about' } },
  },
};

export const Incremented: Story = {
  args: { initialCount: 2 },
  async play({ canvas, userEvent }): Promise<void> {
    await userEvent.click(canvas.getByRole('button', { name: 'Increment' }));
    await expect(canvas.getByTestId('count')).toHaveTextContent('3');
  },
};
