import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Link {
  @Field(() => ID) id!: number;
  @Field() label!: string;
  @Field() url!: string;
}

@ObjectType()
export class Skill {
  @Field(() => ID) id!: number;
  @Field() name!: string;
}

@ObjectType()
export class Experience {
  @Field(() => ID) id!: number;
  @Field() company!: string;
  @Field() position!: string;
  @Field(() => GraphQLISODateTime) startDate!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true }) endDate!: Date | null;
  @Field() achievements!: string;
}

@ObjectType()
export class Project {
  @Field(() => ID) id!: number;
  @Field() name!: string;
  @Field() description!: string;
  @Field() url!: string;
}

@ObjectType()
export class Profile {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() description!: string;
  @Field(() => [Link]) links!: Link[];
  @Field(() => [Skill]) skills!: Skill[];
  @Field(() => [Experience]) experience!: Experience[];
  @Field(() => [Project]) projects!: Project[];
}
