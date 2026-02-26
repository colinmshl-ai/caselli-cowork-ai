import { Link } from "react-router-dom";
import { Home, User } from "lucide-react";

interface EntityLinkerProps {
  dealId?: string;
  contactId?: string;
  children: React.ReactNode;
}

const EntityLinker = ({ dealId, contactId, children }: EntityLinkerProps) => {
  if (!dealId && !contactId) return <>{children}</>;

  return (
    <div>
      {children}
      <div className="flex items-center gap-2 mt-2 animate-fade-in">
        {dealId && (
          <Link
            to={`/deals?highlight=${dealId}`}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
          >
            <Home size={12} />
            View deal
          </Link>
        )}
        {contactId && (
          <Link
            to={`/contacts?highlight=${contactId}`}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
          >
            <User size={12} />
            View contact
          </Link>
        )}
      </div>
    </div>
  );
};

export default EntityLinker;
