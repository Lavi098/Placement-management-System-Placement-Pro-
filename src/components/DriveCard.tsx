import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Building2, Clock, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";

interface DriveCardProps {
  company: string;
  role: string;
  deadline: string;
  status: "pending" | "applied" | "shortlisted" | "rejected" | "upcoming" | "ongoing" | "active" | "closed";
  package: string;
  location: string;
  description: string;
  applyLink?: string;
  driveId?: string;
}

const DriveCard = ({ 
  company, 
  role, 
  deadline, 
  status, 
  package: pkg,
  location,
  description,
  applyLink,
  driveId
}: DriveCardProps) => {
  const navigate = useNavigate();
  // eslint-disable-next-line react-hooks/purity
  const isDeadlineClose = new Date(deadline) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  
  const handleCardClick = () => {
    if (driveId) {
      // Check if we're on student dashboard or admin dashboard
      const isFromStudent = window.location.pathname.includes('/student');
      navigate(`/admin/drive/${driveId}`, { 
        state: { fromStudent: isFromStudent, fromAdmin: !isFromStudent } 
      });
    }
  };
  
  return (
    <Card 
      className="group border-2 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors duration-300">
              {company}
            </CardTitle>
            <CardDescription className="text-base font-semibold text-slate-600 dark:text-slate-400">
              {role}
            </CardDescription>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {description}
        </p>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className={`flex items-center gap-2.5 p-2.5 rounded-lg ${isDeadlineClose ? 'bg-accent/10 dark:bg-accent/20 border border-accent/20' : 'bg-slate-100/50 dark:bg-slate-800/50'}`}>
            <Calendar className={`h-5 w-5 ${isDeadlineClose ? 'text-accent' : 'text-slate-500 dark:text-slate-400'}`} />
            <span className={`font-semibold ${isDeadlineClose ? "text-accent" : "text-slate-700 dark:text-slate-300"}`}>
              {deadline}
            </span>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-100/50 dark:bg-slate-800/50">
            <Building2 className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">{location}</span>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border border-primary/20 col-span-2">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-semibold text-base text-primary">{pkg}</span>
          </div>
        </div>

        {applyLink && (status === "upcoming" || status === "active") && (
          <Button 
            className="w-full font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all duration-300 hover:scale-[1.02]" 
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              if (applyLink) {
                navigate(applyLink);
              }
            }}
          >
            Apply Now
            <ExternalLink className="h-5 w-5 ml-2" />
          </Button>
        )}
        
        {isDeadlineClose && (status === "upcoming" || status === "active") && (
          <p className="text-xs text-accent text-center font-medium">
            deadline approaching — apply soon
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DriveCard;
