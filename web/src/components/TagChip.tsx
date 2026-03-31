import { Link } from 'react-router'

interface TagChipProps {
  tag: string
  className?: string
}

export function TagChip({ tag, className }: TagChipProps) {
  return (
    <Link
      to={`/search?q=${encodeURIComponent(tag)}&type=posts`}
      className={`inline-block px-2.5 py-1 rounded-full bg-primary-light text-primary text-xs hover:opacity-80 transition-opacity ${className ?? ''}`}
    >
      #{tag}
    </Link>
  )
}
