import { CourseTask } from '../models';
import { getRepository } from 'typeorm';

export async function getCourseTask(courseTaskId: number) {
  return getRepository(CourseTask)
    .createQueryBuilder('courseTask')
    .innerJoinAndSelect('courseTask.task', 'task')
    .where('courseTask.id = :courseTaskId', { courseTaskId })
    .getOne();
}

export async function getCourseTaskOnly(courseTaskId: number): Promise<{ id: number } | undefined> {
  return getRepository(CourseTask)
    .createQueryBuilder('courseTask')
    .where('courseTask.id = :courseTaskId', { courseTaskId: Number(courseTaskId) })
    .getOne();
}
