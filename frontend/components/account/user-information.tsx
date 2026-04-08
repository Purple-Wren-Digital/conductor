"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StarRating } from "@/components/ui/ratingInput/star-rating-static";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { getRoleDescription, ROLE_ICONS } from "@/lib/utils";
import { ConductorUser, SurveyResults, UserRole } from "@/lib/types";
import { Building, Hash, InfoIcon, Mail, User } from "lucide-react";

export default function UserInformation({
  user,
  marketCenterName,
  userRatingsData,
}: {
  user: ConductorUser;
  marketCenterName?: string;
  userRatingsData?: SurveyResults;
}) {
  const getRoleIcon = (userRole: UserRole) => {
    const Icon = ROLE_ICONS[userRole as keyof typeof ROLE_ICONS];
    return Icon ? (
      <Icon className="h-4 w-4 text-muted-foreground" />
    ) : (
      <User className="h-4 w-4 text-muted-foreground" />
    );
  };

  return (
    <Card className="lg:col-span-3 ">
      <CardHeader>
        <CardTitle className="text-2xl  font-bold flex items-center justify-between gap-2">
          {user?.name || "Profile Information"}
          <ToolTip
            content="Ratings are based on assigned and resolved tickets via survey responses"
            trigger={<InfoIcon className="size-3.5 text-primary" />}
          />
        </CardTitle>
        {!user && (
          <CardDescription className="text-muted-foreground">
            Unable to find your profile information. Please contact support.
          </CardDescription>
        )}
        <div className="flex flex-wrap gap-4 items-center text-sm text-muted-foreground font-medium">
          <span className="flex items-center gap-1">
            Avg User Rating:
            <StarRating
              rating={userRatingsData?.assigneeAverageRating ?? 0}
              size={16}
            />
          </span>
          <span className="flex items-center gap-2 text-sm">
            Avg Ticket Rating:
            <StarRating
              rating={userRatingsData?.overallAverageRating ?? 0}
              size={16}
            />
          </span>
          <span className="flex items-center gap-2 text-sm">
            Avg Market Center Rating:
            <StarRating
              rating={userRatingsData?.marketCenterAverageRating ?? 0}
              size={16}
            />
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <p className="hidden lg:inline text-muted-foreground">Email:</p>
          <p className="font-medium">{user?.email}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Building className="h-4 w-4 text-muted-foreground" />
          <p className="hidden lg:inline text-muted-foreground">
            Market Center:
          </p>
          <p className="font-medium">{marketCenterName ?? "Not Assigned"}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <p className="hidden lg:inline text-muted-foreground">User ID:</p>
          <p className="font-medium">
            {user?.id ? `${user?.id.slice(0, 8)}` : "Not found"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {getRoleIcon(user?.role || "AGENT")}
          <p className="hidden lg:inline text-muted-foreground">Role:</p>
          <ToolTip
            trigger={
              <Badge
                variant={(user?.role ? user.role.toLowerCase() : "user") as any}
                title={user?.role || "AGENT"}
                className="text-xs px-2 py-0.5"
              >
                <p className="font-medium">{user?.role || "AGENT"}</p>
              </Badge>
            }
            content={getRoleDescription(user?.role || "AGENT")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
