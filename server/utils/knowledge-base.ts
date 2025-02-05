import * as cheerio from "cheerio";
import fetch from "node-fetch";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Document {
  content: string;
  url: string;
  embedding: number[];
}

export class KnowledgeBase {
  private documents: Document[] = [];
  private initialized = false;
  private visitedUrls = new Set<string>();
  private baseUrl = "https://artificialintelligenceact.eu";
  private usCodeContent: string[] = [];

  private async processUSCodeZip(zipPath: string) {
    const zip = require("adm-zip");
    const xmlParser = require("fast-xml-parser");
    const fs = require('fs/promises');

    try {
      // Try to load from object storage first
      try {
        const storedData = await fs.readFile('us_code_data.json', 'utf8');
        const parsedData = JSON.parse(storedData);
        this.documents.push(...parsedData);
        console.log("Loaded US Code data from storage");
        return;
      } catch (err) {
        console.log("No stored US Code data found, processing from ZIP...");
      }

      const zipFile = new zip(zipPath);
      const zipEntries = zipFile.getEntries();
      const processedDocuments = [];

      for (const entry of zipEntries) {
        if (entry.entryName.endsWith(".xml")) {
          const content = entry.getData().toString("utf8");
          const result = xmlParser.parse(content);
          const extractedText = JSON.stringify(result, null, 2);
          this.usCodeContent.push(extractedText);
          
          const embedding = await this.generateEmbedding(extractedText);
          const document = {
            content: extractedText,
            url: "US Code",
            embedding: embedding,
          };
          processedDocuments.push(document);
        }
      }

      // Store processed documents
      this.documents.push(...processedDocuments);
      await fs.writeFile('us_code_data.json', JSON.stringify(processedDocuments));
      console.log("US Code data processed and stored");
    } catch (error) {
      console.error("Error processing US Code ZIP:", error);
    }
  }

  async initialize() {
    if (this.initialized) return;

    try {
      await this.processUSCodeZip(
        "attached_assets/xml_uscAll@118-250not159 2.zip",
      );
      console.log("processed US Code");
      // Try to load cached documents
      const cached = await fs.readFile(
        path.join(process.cwd(), "cached-knowledge.json"),
        "utf-8",
      );
      this.documents = JSON.parse(cached);
      this.initialized = true;
    } catch {
      // If cache doesn't exist, fetch and process the content
      await this.fetchAndProcessContent();
    }
  }

  private async fetchAndProcessContent() {
    try {
      await this.crawlPage(this.baseUrl);

      // Cache the processed documents
      await fs.writeFile(
        path.join(process.cwd(), "cached-knowledge.json"),
        JSON.stringify(this.documents),
      );

      this.initialized = true;
    } catch (error) {
      console.error("Error processing knowledge base:", error);
      throw error;
    }
  }

  private async crawlPage(url: string) {
    if (this.visitedUrls.has(url)) return;
    this.visitedUrls.add(url);

    try {
      console.log(`Crawling: ${url}`);
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract main content text, removing scripts and styles
      $("script").remove();
      $("style").remove();
      const rawText = $("body").text();

      // Split into chunks of roughly 1000 characters
      const chunks = this.chunkText(rawText.trim(), 1000);

      // Generate embeddings for each chunk
      for (const chunk of chunks) {
        const embedding = await this.generateEmbedding(chunk);
        this.documents.push({
          content: chunk,
          url: url,
          embedding: embedding,
        });
      }

      // Find all links on the page
      const links = $("a")
        .map((_, el) => $(el).attr("href"))
        .get()
        .filter((href) => href && this.isValidUrl(href))
        .map((href) => this.resolveUrl(href, url));

      // Recursively crawl each link
      for (const link of links) {
        if (!this.visitedUrls.has(link)) {
          await this.crawlPage(link);
        }
      }
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
    }
  }

  private isValidUrl(href: string): boolean {
    if (!href) return false;

    // Ignore anchors, external links, and non-http(s) protocols
    return (
      !href.startsWith("#") &&
      !href.startsWith("mailto:") &&
      !href.startsWith("tel:") &&
      (href.startsWith("/") || href.startsWith(this.baseUrl))
    );
  }

  private resolveUrl(href: string, baseUrl: string): string {
    if (href.startsWith("http")) return href;
    if (href.startsWith("/")) return `${this.baseUrl}${href}`;
    return new URL(href, baseUrl).toString();
  }

  private chunkText(text: string, chunkSize: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const word of words) {
      if (currentLength + word.length > chunkSize) {
        chunks.push(currentChunk.join(" "));
        currentChunk = [];
        currentLength = 0;
      }
      currentChunk.push(word);
      currentLength += word.length + 1; // +1 for space
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));
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

  async getRelevantContext(
    query: string,
    maxResults: number = 3,
  ): Promise<string> {
    await this.initialize();

    const queryEmbedding = await this.generateEmbedding(query);

    // Calculate cosine similarity with all documents
    const similarities = this.documents.map((doc) => ({
      content: doc.content,
      url: doc.url,
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    // Sort by similarity and get top results
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topResults = similarities.slice(0, maxResults);

    return topResults.map((r) => `From ${r.url}:\n${r.content}`).join("\n\n");
  }

  private cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    const dotProduct = embedding1.reduce(
      (acc, val, i) => acc + val * embedding2[i],
      0,
    );
    const norm1 = Math.sqrt(
      embedding1.reduce((acc, val) => acc + val * val, 0),
    );
    const norm2 = Math.sqrt(
      embedding2.reduce((acc, val) => acc + val * val, 0),
    );
    return dotProduct / (norm1 * norm2);
  }
}

export const knowledgeBase = new KnowledgeBase();
