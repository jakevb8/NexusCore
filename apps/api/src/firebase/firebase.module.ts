import { Module, Global, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as admin from 'firebase-admin'

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('FirebaseModule')

        if (admin.apps.length > 0) {
          logger.log('Reusing existing Firebase Admin app')
          return admin.app()
        }

        const projectId = config.get<string>('FIREBASE_PROJECT_ID')
        const clientEmail = config.get<string>('FIREBASE_CLIENT_EMAIL')
        const privateKey = config
          .get<string>('FIREBASE_PRIVATE_KEY')
          ?.replace(/\\n/g, '\n')

        if (!projectId || !clientEmail || !privateKey) {
          throw new Error(
            'Firebase Admin credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.',
          )
        }

        const app = admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        })

        logger.log(`Firebase Admin initialized for project: ${projectId}`)
        return app
      },
    },
  ],
  exports: ['FIREBASE_ADMIN'],
})
export class FirebaseModule {}
