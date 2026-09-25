"use client";

import { useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "./icons";

export type SelectOption = {
  value: string;
  label: string;
};

export function CustomSelect({
  defaultValue,
  id,
  name,
  options,
}: {
  defaultValue: string;
  id: string;
  name: string;
  options: SelectOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];

  function close() {
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  function select(nextValue: string) {
    setValue(nextValue);
    close();
  }

  function moveSelection(offset: number) {
    const nextIndex =
      (selectedIndex + offset + options.length) % options.length;
    setValue(options[nextIndex].value);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      moveSelection(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      close();
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && isOpen) {
      event.preventDefault();
      close();
    }
  }

  return (
    <div
      className={`custom-select${isOpen ? " custom-select-open" : ""}`}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget)) setIsOpen(false);
      }}
      ref={rootRef}
    >
      <input name={name} type="hidden" value={value} />
      <button
        aria-controls={`${id}-options`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="custom-select-trigger"
        id={id}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleKeyDown}
        ref={buttonRef}
        type="button"
      >
        <span>{selected.label}</span>
        <ChevronDownIcon />
      </button>
      {isOpen ? (
        <div
          aria-activedescendant={`${id}-option-${selectedIndex}`}
          className="custom-select-options"
          id={`${id}-options`}
          role="listbox"
        >
          {options.map((option, index) => (
            <button
              aria-selected={option.value === value}
              className="custom-select-option"
              id={`${id}-option-${index}`}
              key={option.value || "all"}
              onClick={() => select(option.value)}
              role="option"
              type="button"
            >
              <span>{option.label}</span>
              {option.value === value ? <CheckIcon /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
