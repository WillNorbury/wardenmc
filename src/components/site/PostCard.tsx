import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/site/VerifiedBadge";
import { relativeTime, type Post } from "@/lib/posts";
import { userProfilePath } from "@/lib/userSlug";

type Props = {
  post: Post;
  canDelete?: boolean;
  onLike?: (post: Post) => void;
  onReply?: (post: Post) => void;
  onDelete?: (post: Post) => void;
};

export const PostCard = ({ post, canDelete, onLike, onReply, onDelete }: Props) => {
  const author = post.author;
  const name = author?.display_name || author?.mc_username || "Anonymous";
  const handle = (author?.mc_username || author?.display_name || "member")
    .toLowerCase()
    .replace(/\s+/g, "");
  const avatar =
    author?.avatar_url ||
    (author?.mc_username ? `https://mc-heads.net/avatar/${author.mc_username}/128` : undefined);

  const profilePath = author
    ? userProfilePath({ id: author.id, display_name: author.display_name, mc_username: author.mc_username })
    : null;

  return (
    <Card className="p-4 border-border/70 hover:border-primary/40 transition-colors">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          {avatar && <AvatarImage src={avatar} alt={`${name} avatar`} />}
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm">
            {profilePath ? (
              <Link to={profilePath} className="font-semibold hover:underline truncate">
                {name}
              </Link>
            ) : (
              <span className="font-semibold truncate">{name}</span>
            )}
            {author?.verified && <VerifiedBadge />}
            <span className="text-muted-foreground truncate">@{handle}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{relativeTime(post.created_at)}</span>
          </div>

          <p className="mt-1 whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">{post.content}</p>

          {post.image_url && (
            <img
              src={post.image_url}
              alt="Post attachment"
              loading="lazy"
              className="mt-3 max-h-96 w-full rounded-lg border border-border object-cover"
            />
          )}

          <div className="mt-3 flex items-center gap-1 text-muted-foreground">
            <Button variant="ghost" size="sm" className="gap-1.5 px-2" onClick={() => onReply?.(post)}>
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{post.replies || ""}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("gap-1.5 px-2", post.likedByMe && "text-primary")}
              onClick={() => onLike?.(post)}
            >
              <Heart className={cn("h-4 w-4", post.likedByMe && "fill-current")} />
              <span className="text-xs">{post.likes || ""}</span>
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto px-2 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete?.(post)}
                aria-label="Delete post"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PostCard;
