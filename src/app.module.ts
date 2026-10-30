import { Controller, Get, Module, Redirect } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ProfileModule } from './profile/profile.module';
import { PrismaService } from './database/prisma.service';

@Controller()
class AppController {
  constructor(private readonly db: PrismaService) {}
  @Get() @Redirect('/graphql', 302)
  index() {}
  @Get('health')
  async health() {
    await this.db.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    ProfileModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      playground: false,
      introspection: true,
      includeStacktraceInErrorResponses: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault({
        embed: { runTelemetry: false },
        document: `query DigitalCard {
  profile {
    name description
    links { label url }
    skills { name }
    experience { company position startDate endDate achievements }
    projects { name description url }
  }
}`,
      })],
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
