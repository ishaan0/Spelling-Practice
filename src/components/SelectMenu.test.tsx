import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { SelectMenu } from './SelectMenu';

const OPTIONS = [
  { value: 'a', label: 'Week 1', description: '10 words' },
  { value: 'b', label: 'Week 2' },
  { value: 'c', label: 'Science' },
  { value: 'd', label: 'Spelling bee' },
];

function renderMenu(onChange = vi.fn()) {
  function Harness() {
    const [value, setValue] = useState('a');
    return (
      <>
        <span id="menu-label">Collection</span>
        <SelectMenu
          labelledBy="menu-label"
          options={OPTIONS}
          value={value}
          onChange={(v) => {
            setValue(v);
            onChange(v);
          }}
        />
        <button type="button">Elsewhere</button>
      </>
    );
  }
  render(<Harness />);
  return { onChange, button: screen.getByRole('combobox', { name: 'Collection' }) };
}

describe('SelectMenu', () => {
  it('shows the chosen option and opens a list of all options on click', async () => {
    const user = userEvent.setup();
    const { button } = renderMenu();
    expect(button).toHaveTextContent('Week 1');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveAccessibleName(/^Week 1\s*, 10 words$/);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('chooses an option with the mouse and closes', async () => {
    const user = userEvent.setup();
    const { button, onChange } = renderMenu();

    await user.click(button);
    await user.click(screen.getByRole('option', { name: 'Science' }));

    expect(onChange).toHaveBeenCalledWith('c');
    expect(button).toHaveTextContent('Science');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('moves through the options with the keyboard', async () => {
    const user = userEvent.setup();
    const { button, onChange } = renderMenu();
    button.focus();

    await user.keyboard('{ArrowDown}');
    const activeId = () => button.getAttribute('aria-activedescendant');
    expect(document.getElementById(activeId()!)).toHaveTextContent('Week 1');

    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(document.getElementById(activeId()!)).toHaveTextContent('Science');
    await user.keyboard('{End}');
    expect(document.getElementById(activeId()!)).toHaveTextContent('Spelling bee');
    await user.keyboard('{ArrowDown}');
    expect(document.getElementById(activeId()!)).toHaveTextContent('Spelling bee');

    await user.keyboard('{Home}{Enter}');
    // Choosing the current option again is not a change.
    expect(onChange).not.toHaveBeenCalled();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('jumps to an option by typing the start of its name', async () => {
    const user = userEvent.setup();
    const { button, onChange } = renderMenu();
    button.focus();

    await user.keyboard('sp');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(button.getAttribute('aria-activedescendant')!)).toHaveTextContent(
      'Spelling bee',
    );
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('d');
  });

  it('closes without choosing on Escape or when focus moves elsewhere', async () => {
    const user = userEvent.setup();
    const { button, onChange } = renderMenu();

    await user.click(button);
    await user.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.click(button);
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
