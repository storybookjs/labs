import type { Meta, StoryObj } from '@storybook/vue3-vite';

import Button from './Button.vue';

type Story = StoryObj<typeof META>;

const META = {
  title: 'Example/Button',
  component: Button,
  argTypes: {
    label: { control: 'text' },
    variant: { control: 'select', options: ['primary', 'secondary'] },
    disabled: { control: 'boolean' },
  },
  args: {
    disabled: false,
  },
} satisfies Meta<typeof Button>;

export default META;

export const Primary: Story = {
  args: {
    label: 'Primary button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    label: 'Secondary button',
    variant: 'secondary',
  },
};
