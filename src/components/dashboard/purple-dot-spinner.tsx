type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'inline';

export function PurpleDotSpinner({
  size = 'sm',
  label = 'Loading',
}: {
  size?: SpinnerSize;
  label?: string;
}) {
  const dotSize =
    size === 'icon' || size === 'xs' || size === 'inline'
      ? 'h-1.5 w-1.5'
      : size === 'sm'
        ? 'h-2.5 w-2.5'
        : size === 'md'
          ? 'h-3 w-3'
          : 'h-3.5 w-3.5';

  const containerClass =
    size === 'icon'
      ? 'h-4 w-4'
      : size === 'xs'
        ? 'h-3 w-3'
        : size === 'inline'
          ? 'h-3.5 w-3.5'
          : size === 'sm'
            ? 'h-7 w-7'
            : size === 'md'
              ? 'h-9 w-9'
              : 'h-12 w-12';

  return (
    <span
      className={cx('inline-grid grid-cols-2 grid-rows-2 gap-1', containerClass)}
      role="status"
      aria-label={label}
    >
      <span
        className={cx(
          dotSize,
          'animate-[pulse_0.9s_ease-in-out_infinite] rounded-full bg-[#6f4cf6]',
        )}
      />
      <span
        className={cx(
          dotSize,
          'animate-[pulse_0.9s_ease-in-out_0.2s_infinite] rounded-full bg-[#8f6cff]',
        )}
      />
      <span
        className={cx(
          dotSize,
          'animate-[pulse_0.9s_ease-in-out_0.3s_infinite] rounded-full bg-[#9f84ff]',
        )}
      />
      <span
        className={cx(
          dotSize,
          'animate-[pulse_0.9s_ease-in-out_0.45s_infinite] rounded-full bg-[#b19dff]',
        )}
      />
    </span>
  );
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}
