import type { Meta, StoryObj } from '@storybook-vue/nuxt';

import CounterButton from './CounterButton.vue';

type Story = StoryObj<typeof META>;

const META = {
  title: 'Example/Counter Button',
  component: CounterButton,
  argTypes: {
    label: { control: 'text' },
    variant: { control: 'select', options: ['primary', 'secondary'] },
    disabled: { control: 'boolean' },
  },
  args: {
    disabled: false,
  },
} satisfies Meta<typeof CounterButton>;

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
