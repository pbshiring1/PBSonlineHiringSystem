// Utility script to seed Firebase with sample jobs
import { createJob } from '../firebase';

const sampleJobs = [
  {
    title: 'ELECTRONICS ENGINEER',
    description: 'Design, Develop, and test electronic components and systems',
    location: 'Legaspi city',
    salary: '$50,000 - $80,000',
    employmentType: 'full-time',
    experienceLevel: 'mid-level',
    yearsOfExperience: '1 year',
    requirements: 'Bachelor\'s degree in Electronics Engineering, 1+ years experience',
    benefits: 'Health insurance, flexible hours, remote work options',
    status: 'active'
  },
  {
    title: 'ELECTRICAL ENGINEER',
    description: 'Focuses on the design, development, and maintenance of electrical systems',
    location: 'Imus cavite',
    salary: '$45,000 - $70,000',
    employmentType: 'full-time',
    experienceLevel: 'mid-level',
    yearsOfExperience: '1 year',
    requirements: 'Design degree, 1+ years experience, electrical systems knowledge',
    benefits: 'Health insurance, creative freedom, team collaboration',
    status: 'active'
  },
  {
    title: 'ELECTRICIAN',
    description: 'Installs, maintains, and repairs electrical wiring, outlets, lighting systems, and circuit breakers',
    location: 'Laog, ilocos city',
    salary: '$35,000 - $55,000',
    employmentType: 'full-time',
    experienceLevel: 'entry-level',
    yearsOfExperience: '1 year',
    requirements: 'Electrical certification, 1+ years experience, safety training',
    benefits: 'Health insurance, overtime pay, safety equipment',
    status: 'active'
  },
  {
    title: 'TECHNICIAN',
    description: 'A general term for a skilled worker who performs practical tasks and troubleshooting in fields',
    location: 'Legaspi city',
    salary: '$30,000 - $50,000',
    employmentType: 'full-time',
    experienceLevel: 'entry-level',
    yearsOfExperience: '1 year',
    requirements: 'Technical certification, troubleshooting skills, 1+ years experience',
    benefits: 'Health insurance, training opportunities, career growth',
    status: 'active'
  },
  {
    title: 'PAINTER',
    description: 'Applies paint and finishes to surfaces.',
    location: 'Rosario, la union',
    salary: '$25,000 - $40,000',
    employmentType: 'full-time',
    experienceLevel: 'entry-level',
    yearsOfExperience: '4 months',
    requirements: 'Painting experience, attention to detail, 4+ months experience',
    benefits: 'Health insurance, flexible schedule, creative work',
    status: 'active'
  },
  {
    title: 'HELPER',
    description: 'Assists skilled workers in various tasks and learns on the job',
    location: 'Cordon, isabela',
    salary: '$20,000 - $30,000',
    employmentType: 'full-time',
    experienceLevel: 'entry-level',
    yearsOfExperience: 'No formal experience',
    requirements: 'Willingness to learn, physical stamina, teamwork skills',
    benefits: 'Health insurance, training, career advancement',
    status: 'active'
  }
];

export const seedJobs = async () => {
  try {
    console.log('Starting to seed jobs...');
    
    for (const job of sampleJobs) {
      try {
        const createdJob = await createJob(job);
        console.log('Created job:', createdJob.title);
      } catch (error) {
        console.error('Error creating job:', job.title, error);
      }
    }
    
    console.log('Job seeding completed!');
  } catch (error) {
    console.error('Error seeding jobs:', error);
  }
};

// Function to check if jobs already exist
export const checkJobsExist = async () => {
  try {
    const { getAllJobs } = await import('../firebase');
    const jobs = await getAllJobs();
    console.log('Existing jobs count:', jobs.length);
    return jobs.length > 0;
  } catch (error) {
    console.error('Error checking existing jobs:', error);
    return false;
  }
};
