import { NextRequest, NextResponse } from 'next/server';

interface Course {
  id: string;
  name: string;
  code: string;
  semester: string;
  year: string;
  professorId: string;
  professorName: string;
  description: string;
  students: CourseStudent[];
  assignments: CourseAssignment[];
}

interface CourseStudent {
  id: string;
  name: string;
  email: string;
  enrolledAt: Date;
}

interface CourseAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  maxPoints: number;
  submissions: AssignmentSubmission[];
}

interface AssignmentSubmission {
  id: string;
  studentId: string;
  studentName: string;
  content: string;
  attachments: any[];
  submittedAt: Date;
  grade?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'returned';
}

// Mock database
let courses: Course[] = [
  {
    id: 'course-1',
    name: 'Constitutional Law I',
    code: 'LAW 201',
    semester: 'Spring',
    year: '2024',
    professorId: 'prof-1',
    professorName: 'Prof. Sarah Johnson',
    description: 'Introduction to constitutional law principles, focusing on separation of powers, federalism, and individual rights.',
    students: [
      {
        id: 'student-1',
        name: 'John Doe',
        email: 'john.doe@student.law.edu',
        enrolledAt: new Date('2024-01-15')
      },
      {
        id: 'student-2',
        name: 'Jane Smith',
        email: 'jane.smith@student.law.edu',
        enrolledAt: new Date('2024-01-15')
      }
    ],
    assignments: [
      {
        id: 'assignment-1',
        title: 'Constitutional Analysis Paper',
        description: 'Analyze a recent Supreme Court case and its constitutional implications.',
        dueDate: new Date('2024-03-15'),
        maxPoints: 100,
        submissions: []
      }
    ]
  }
];

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const professorId = url.searchParams.get('professorId');
    
    let filteredCourses = courses;
    if (professorId) {
      filteredCourses = courses.filter(course => course.professorId === professorId);
    }
    
    return NextResponse.json({
      success: true,
      data: filteredCourses
    });
  } catch (error) {
    console.error('Get courses error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const courseData = await request.json();
    
    const newCourse: Course = {
      id: `course-${Date.now()}`,
      ...courseData,
      students: [],
      assignments: []
    };
    
    courses.push(newCourse);
    
    return NextResponse.json({
      success: true,
      data: newCourse
    });
  } catch (error) {
    console.error('Create course error:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
}
