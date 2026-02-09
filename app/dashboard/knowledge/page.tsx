"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Need to check if installed, if not, use standard textarea or install
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createKnowledgeBase,
  getKnowledgeBases,
} from "@/app/actions/knowledge-actions";

// Mock company ID for MVP
const COMPANY_ID = "company-1";

export default function KnowledgeBasePage() {
  const [kbs, setKbs] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  const loadKbs = async () => {
    const res = await getKnowledgeBases(COMPANY_ID);
    if (res.success) {
      setKbs(res.kbs || []);
    }
  };

  useEffect(() => {
    loadKbs();
  }, []);

  const handleCreate = async () => {
    if (!name || !content) return;
    await createKnowledgeBase({ name, content, companyId: COMPANY_ID });
    setName("");
    setContent("");
    loadKbs();
  };

  return (
    <div className='p-8 space-y-8'>
      <h2 className='text-3xl font-bold tracking-tight'>知识库</h2>

      <Card>
        <CardHeader>
          <CardTitle>添加新知识</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Input
            placeholder='标题 (例如：公司政策)'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className='flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
            placeholder='内容 (文本或 URL...)'
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <Button onClick={handleCreate}>创建知识库</Button>
        </CardContent>
      </Card>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {kbs.map((kb) => (
          <Card key={kb.id}>
            <CardHeader>
              <CardTitle>{kb.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground line-clamp-3'>
                {kb.content}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
