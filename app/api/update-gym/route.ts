import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * PATCH /api/update-gym
 * 体育館の名前を更新する（ユーザーが手動で施設名を入力した場合）
 */
export async function PATCH(request: NextRequest) {
  try {
    const { gymId, gymName } = await request.json();

    if (!gymId || !gymName?.trim()) {
      return NextResponse.json(
        { error: 'gymId and gymName are required' },
        { status: 400 }
      );
    }

    const firestoreId = gymId.replace(/^gym_/, '');
    const gymRef = doc(db, 'gyms', firestoreId);
    await updateDoc(gymRef, { name: gymName.trim() });

    console.log(`✅ Gym name updated: ${gymId} → ${gymName.trim()}`);

    return NextResponse.json({ success: true, gymId, gymName: gymName.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to update gym name:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
