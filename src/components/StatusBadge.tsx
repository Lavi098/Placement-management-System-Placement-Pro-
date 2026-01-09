import { Badge } from "@/components/ui/badge";
import { ApplicationStatus } from "@/models/applications";
import { DriveStatus } from "@/models/drives";

type StatusBadgeStatus = ApplicationStatus | DriveStatus | "pending" | "ongoing";

interface StatusBadgeProps {
  status: StatusBadgeStatus;
}

const statusVariants: Record<StatusBadgeStatus, string> = {
  pending: "bg-accent/10 text-accent border-accent/20",
  applied: "bg-primary/10 text-primary border-primary/20",
  shortlisted: "bg-success/10 text-success border-success/20",
  selected: "bg-success/10 text-success border-success/20",
  joined: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  upcoming: "bg-accent/10 text-accent border-accent/20",
  ongoing: "bg-primary/10 text-primary border-primary/20",
  active: "bg-primary/10 text-primary border-primary/20",
  closed: "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<StatusBadgeStatus, string> = {
  pending: "Pending",
  applied: "Applied",
  shortlisted: "Shortlisted",
  selected: "Selected",
  joined: "Joined",
  rejected: "Not Selected",
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  active: "Active",
  closed: "Closed",
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const normalizedStatus = status === "active" ? "ongoing" : status;

  return (
    <Badge variant="outline" className={statusVariants[normalizedStatus]}>
      {statusLabels[normalizedStatus]}
    </Badge>
  );
};

export default StatusBadge;
