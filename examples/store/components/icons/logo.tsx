import clsx from "clsx";

export default function LogoIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`${process.env.SITE_NAME} logo`}
      viewBox="0 0 32 32"
      {...props}
      className={clsx("h-4 w-4 fill-black dark:fill-white", props.className)}
    >
      <circle cx="6" cy="16" r="3.5" />
      <circle cx="26" cy="8" r="3.5" />
      <circle cx="26" cy="24" r="3.5" />
      <rect x="9" y="14.5" width="11" height="3" rx="1" />
      <rect
        x="16.5"
        y="10"
        width="11"
        height="3"
        rx="1"
        transform="rotate(35 16.5 10)"
      />
      <rect
        x="16.5"
        y="19"
        width="11"
        height="3"
        rx="1"
        transform="rotate(-35 16.5 19)"
      />
    </svg>
  );
}
