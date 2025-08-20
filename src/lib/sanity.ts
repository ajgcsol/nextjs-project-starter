import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'your-project-id',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  useCdn: false, // Set to true in production for faster reads
  apiVersion: '2024-01-01'
})

const builder = imageUrlBuilder(client)

export function urlFor(source: any) {
  return builder.image(source)
}

// Video queries
export const videoQueries = {
  // Get all videos
  all: `*[_type == "video"] | order(_createdAt desc) {
    _id,
    title,
    description,
    category,
    tags,
    videoFile,
    thumbnail,
    duration,
    visibility,
    status,
    views,
    _createdAt,
    _updatedAt
  }`,

  // Get public videos only
  public: `*[_type == "video" && visibility == "public" && status == "published"] | order(_createdAt desc) {
    _id,
    title,
    description,
    category,
    tags,
    videoFile,
    thumbnail,
    duration,
    visibility,
    status,
    views,
    _createdAt,
    _updatedAt
  }`,

  // Get video by ID
  byId: (id: string) => `*[_type == "video" && _id == "${id}"][0] {
    _id,
    title,
    description,
    category,
    tags,
    videoFile,
    thumbnail,
    duration,
    visibility,
    status,
    views,
    _createdAt,
    _updatedAt
  }`,

  // Search videos
  search: (query: string) => `*[_type == "video" && (title match "${query}*" || description match "${query}*" || "${query}" in tags)] | order(_createdAt desc) {
    _id,
    title,
    description,
    category,
    tags,
    videoFile,
    thumbnail,
    duration,
    visibility,
    status,
    views,
    _createdAt,
    _updatedAt
  }`
}

// Helper functions
export const sanityHelpers = {
  // Create video
  async createVideo(videoData: any) {
    return client.create({
      _type: 'video',
      ...videoData
    })
  },

  // Update video
  async updateVideo(id: string, updates: any) {
    return client.patch(id).set(updates).commit()
  },

  // Delete video
  async deleteVideo(id: string) {
    return client.delete(id)
  },

  // Increment views
  async incrementViews(id: string) {
    return client.patch(id).inc({ views: 1 }).commit()
  },

  // Get file URL
  getFileUrl(asset: any) {
    if (!asset) return null
    return `https://cdn.sanity.io/files/${client.config().projectId}/${client.config().dataset}/${asset.asset._ref.replace('file-', '').replace('-', '.')}`
  }
}