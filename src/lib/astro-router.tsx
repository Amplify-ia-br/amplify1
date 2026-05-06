import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  replace?: boolean;
  state?: any;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, replace, state, ...props }, ref) => <a ref={ref} href={to} {...props} />,
);
Link.displayName = "Link";

export const NavLink = forwardRef<HTMLAnchorElement, LinkProps & { activeClassName?: string; pendingClassName?: string; children: ReactNode; }>(
  ({ to, className = "", activeClassName = "", pendingClassName = "", children, ...props }, ref) => {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const isActive = pathname === to;
  return (
    <a
      ref={ref}
      href={to}
      className={[className, isActive ? activeClassName : ""].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </a>
  );
  },
);
NavLink.displayName = "NavLink";

export const useLocation = () => ({
  pathname: typeof window !== "undefined" ? window.location.pathname : "/",
  state: undefined,
});

export const useNavigate = () => {
  return (to: string, options?: { replace?: boolean }) => {
    if (typeof window !== "undefined") {
      if (options?.replace) window.location.replace(to);
      else window.location.assign(to);
    }
  };
};

export const useParams = () => ({});

export const Navigate = ({ to }: { to: string }) => {
  if (typeof window !== "undefined") {
    window.location.assign(to);
  }
  return null;
};
