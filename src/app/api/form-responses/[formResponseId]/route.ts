import { NextRequest, NextResponse } from 'next/server';
import { FormResponseService } from '@/services/form-response.service';
import { getAuthenticatedServerContext } from '@/app/(authenticated)/getAuthenticatedServerContext';

export async function GET(
  request: NextRequest,
  { params }: { params: { formResponseId: string } }
) {
  try {
    const { user } = getAuthenticatedServerContext();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const formResponseId = params.formResponseId;
    
    const formResponseData = await FormResponseService.getFormResponse(formResponseId);
    
    if (!formResponseData) {
      return NextResponse.json(
        { error: 'Form response not found' },
        { status: 404 }
      );
    }
    
    // Convert to plain serializable objects by going through JSON stringify/parse cycle
    const serializedData = JSON.parse(JSON.stringify({
      formResponse: formResponseData.formResponse || null,
      formTemplate: formResponseData.formTemplate || null
    }));
    
    return NextResponse.json(serializedData);
  } catch (error) {
    console.error('Error fetching form response:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 