import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Building2, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className='flex min-h-screen flex-col bg-background text-foreground'>
      <header className='flex h-16 items-center justify-between border-b px-6 lg:px-12'>
        <div className='flex items-center gap-2 font-bold text-xl'>
          <Building2 className='h-6 w-6' />
          <span>OPC-Bot</span>
        </div>
        <nav className='flex gap-4'>
          <Link href='/dashboard'>
            <Button variant='ghost'>登录</Button>
          </Link>
          <Link href='/dashboard'>
            <Button>开始使用</Button>
          </Link>
        </nav>
      </header>

      <main className='flex-1 flex flex-col items-center justify-center text-center px-4 py-20 lg:py-32'>
        <div className='mx-auto max-w-3xl space-y-8'>
          <div className='mx-auto w-fit rounded-full bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground flex items-center gap-2'>
            <Sparkles className='h-4 w-4 text-primary' />
            <span>个人创业的未来</span>
          </div>

          <h1 className='text-5xl font-bold tracking-tight sm:text-7xl bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent'>
            一人公司
            <br />
            <span className='text-primary'>由 AI 驱动</span>
          </h1>

          <p className='text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed'>
            无需招聘任何人类员工即可扩展您的业务。 部署 AI
            员工，自动化工作流程，并通过一个仪表盘管理您的整个商业帝国。
          </p>

          <div className='flex flex-col sm:flex-row items-center justify-center gap-4 pt-4'>
            <Link href='/dashboard'>
              <Button
                size='lg'
                className='h-12 px-8 text-lg gap-2'
              >
                进入仪表盘 <ArrowRight className='h-5 w-5' />
              </Button>
            </Link>
            <Button
              variant='outline'
              size='lg'
              className='h-12 px-8 text-lg'
            >
              查看演示
            </Button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-6xl mx-auto px-4'>
          <div className='p-6 rounded-2xl border bg-card text-card-foreground shadow-sm'>
            <Bot className='h-10 w-10 text-primary mb-4' />
            <h3 className='text-xl font-semibold mb-2'>AI 员工</h3>
            <p className='text-muted-foreground'>
              雇佣智能代理担任任何角色 - 无论是标准角色还是自定义角色。
            </p>
          </div>
          <div className='p-6 rounded-2xl border bg-card text-card-foreground shadow-sm'>
            <Building2 className='h-10 w-10 text-primary mb-4' />
            <h3 className='text-xl font-semibold mb-2'>公司管理</h3>
            <p className='text-muted-foreground'>
              使用拖放式画布界面进行可视化层级管理。
            </p>
          </div>
          <div className='p-6 rounded-2xl border bg-card text-card-foreground shadow-sm'>
            <Sparkles className='h-10 w-10 text-primary mb-4' />
            <h3 className='text-xl font-semibold mb-2'>自动化工作流</h3>
            <p className='text-muted-foreground'>
              让您的 AI 团队 24/7 处理任务、邮件和部署工作。
            </p>
          </div>
        </div>
      </main>

      <footer className='border-t py-8 text-center text-sm text-muted-foreground'>
        <p>
          © 2026 一人公司 (One Person Company). 基于 Next.js & LangChain 构建。
        </p>
      </footer>
    </div>
  );
}
