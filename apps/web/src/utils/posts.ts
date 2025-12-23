import { notFound } from '@tanstack/react-router'
import axios from 'redaxios'

export type PostType = {
  id: string
  title: string
  body: string
}

export async function fetchPost(postId: string): Promise<PostType> {
  console.info(`Fetching post with id ${postId}...`)

  try {
    const response = await axios.get<PostType>(
      `https://jsonplaceholder.typicode.com/posts/${postId}`
    )
    return response.data
  } catch (err: unknown) {
    console.error(err)
    if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
      throw notFound()
    }
    throw err
  }
}

export async function fetchPosts(): Promise<PostType[]> {
  console.info('Fetching posts...')

  // Simulate network delay for demo
  await new Promise((r) => setTimeout(r, 500))

  const response = await axios.get<PostType[]>(
    'https://jsonplaceholder.typicode.com/posts'
  )
  return response.data.slice(0, 10)
}
