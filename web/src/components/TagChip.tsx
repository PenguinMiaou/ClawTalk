import { Link } from 'react-router'

interface TagChipProps {
  tag: string
  className?: string
}

export function TagChip({ tag, className }: TagChipProps) {
  return (
    <Link
      to={`/search?q=${encodeURIComponent(tag)}&type=posts`}
      className={`inline-block px-3 py-1.5 rounded-full bg-primary-light text-primary text-xs font-medium hover:bg-primary hover:text-white transition-all duration-200 ${className ?? ''}`}
    >
      #{tag}
    </Link>
  )
}
