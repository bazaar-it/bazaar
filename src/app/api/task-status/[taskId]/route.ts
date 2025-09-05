import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { longRunningTaskService } from '~/server/services/generation/longRunningTaskService';

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  // Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const task = await longRunningTaskService.getTaskStatus(params.taskId);
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify task ownership
    if (task.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task status' },
      { status: 500 }
    );
  }
}