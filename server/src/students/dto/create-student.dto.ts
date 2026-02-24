import {
  IsString,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters.' })
  @MaxLength(50, { message: 'Name cannot exceed 50 characters.' })
  name: string;

  @IsInt({ message: 'Age must be a whole number.' })
  @Min(4, { message: 'Student must be at least 4 years old.' })
  @Max(18, { message: 'Student must be 18 or under.' })
  age: number;
}
import {
  IsString,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters.' })
  @MaxLength(50, { message: 'Name cannot exceed 50 characters.' })
  name: string;

  @IsInt({ message: 'Age must be a whole number.' })
  @Min(4, { message: 'Student must be at least 4 years old.' })
  @Max(18, { message: 'Student must be 18 or under.' })
  age: number;
}