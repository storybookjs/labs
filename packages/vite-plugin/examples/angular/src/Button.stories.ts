import type { Meta, StoryObj } from '@storybook/angular-vite';

import { ButtonComponent } from './ButtonComponent';

type Story = StoryObj<ButtonComponent>;

const META = {
  title: 'Example/Button',
  component: ButtonComponent,
  argTypes: {
    label: { control: 'text' },
    primary: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: { disabled: false },
} satisfies Meta<ButtonComponent>;

export default META;

export const Primary: Story = {
  args: {
    label: 'Primary button',
    primary: true,
  },
};

export const Secondary: Story = {
  args: {
    label: 'Secondary button',
    primary: false,
  },
};
