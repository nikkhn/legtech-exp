import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Document {
  content: string;
  embedding: number[];
}

export class KnowledgeBase {
  private documents: Document[] = [];
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      // Try to load cached documents
      const cached = await fs.readFile(path.join(process.cwd(), 'cached-knowledge.json'), 'utf-8');
      this.documents = JSON.parse(cached);
      this.initialized = true;
    } catch {
      // If cache doesn't exist, fetch and process the content
      await this.fetchAndProcessContent();
    }
  }

  private async fetchAndProcessContent() {
    try {
      const response = await fetch('https://artificialintelligenceact.eu/');
      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract main content text, removing scripts and styles
      $('script').remove();
      $('style').remove();
      const rawText = $('body').text();

      // Split into chunks of roughly 1000 characters
      const chunks = this.chunkText(rawText.trim(), 1000);

      // Generate embeddings for each chunk
      for (const chunk of chunks) {
        const embedding = await this.generateEmbedding(chunk);
        this.documents.push({
          content: chunk,
          embedding: embedding
        });
      }

      // Cache the processed documents
      await fs.writeFile(
        path.join(process.cwd(), 'cached-knowledge.json'),
        JSON.stringify(this.documents)
      );

      this.initialized = true;
    } catch (error) {
      console.error('Error processing knowledge base:', error);
      throw error;
    }
  }

  private chunkText(text: string, chunkSize: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const word of words) {
      if (currentLength + word.length > chunkSize) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
        currentLength = 0;
      }
      currentChunk.push(word);
      currentLength += word.length + 1; // +1 for space
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });

    return response.data[0].embedding;
  }

  async getRelevantContext(query: string, maxResults: number = 2): Promise<string> {
    await this.initialize();

    const queryEmbedding = await this.generateEmbedding(query);

    // Calculate cosine similarity with all documents
    const similarities = this.documents.map((doc) => ({
      content: doc.content,
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    // Sort by similarity and get top results
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topResults = similarities.slice(0, maxResults);

    return topResults.map(r => r.content).join('\n\n');
  }

  private cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    const dotProduct = embedding1.reduce((acc, val, i) => acc + val * embedding2[i], 0);
    const norm1 = Math.sqrt(embedding1.reduce((acc, val) => acc + val * val, 0));
    const norm2 = Math.sqrt(embedding2.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (norm1 * norm2);
  }
}

export const knowledgeBase = new KnowledgeBase();