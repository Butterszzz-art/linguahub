import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/PageContainer";
import { BackLink } from "@/components/BackLink";
import { Card } from "@/components/ui/Card";
import { ConversationChat } from "@/components/conversation/ConversationChat";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string; conversationId: string }>;
}) {
  const { id, conversationId } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      classroom: true,
      lesson: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation || conversation.classroomId !== id) {
    notFound();
  }

  return (
    <PageContainer>
      <BackLink href={`/classroom/${id}`} label={`Back to ${conversation.classroom.language}`} />

      <p className="font-display text-xs font-bold uppercase tracking-wide text-ink-muted">
        {conversation.classroom.language}
        {conversation.classroom.level ? ` · ${conversation.classroom.level}` : ""}
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
        {conversation.lesson
          ? `Practice: ${conversation.lesson.title}`
          : conversation.title ?? "Conversation practice"}
      </h1>

      <Card className="mt-6 overflow-hidden p-0">
        <ConversationChat conversationId={conversation.id} initialMessages={conversation.messages} />
      </Card>
    </PageContainer>
  );
}
