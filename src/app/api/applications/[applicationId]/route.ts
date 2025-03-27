import { NextRequest, NextResponse } from 'next/server';
import { ApplicationService } from '@/services/application.service';
import { getAuthenticatedServerContext } from '@/app/(authenticated)/getAuthenticatedServerContext';

export async function GET(
  request: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  try {
    const { user } = getAuthenticatedServerContext();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const applicationId = params.applicationId;
    
    const application = await ApplicationService.getApplicationDetails(applicationId);
    
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
    // Convert to plain serializable objects
    const serializedData = JSON.parse(JSON.stringify(application));
    
    return NextResponse.json(serializedData);
  } catch (error) {
    console.error('Error fetching application details:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 