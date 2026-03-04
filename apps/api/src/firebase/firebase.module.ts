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

        const projectId = config.get<string>('FIREBASE_PROJECT_ID')?.replace(/^"|"$/g, '')
        const clientEmail = config.get<string>('FIREBASE_CLIENT_EMAIL')?.replace(/^"|"$/g, '')
        const privateKey = config
          .get<string>('FIREBASE_PRIVATE_KEY')
          ?.replace(/^"|"$/g, '')
          .replace(/\\n/g, '\n')

        if (!projectId || !clientEmail || !privateKey) {
          const msg =
            'Firebase Admin credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.'
          if (process.env.NODE_ENV === 'production') {
            throw new Error(msg)
          }
          logger.warn(msg + ' Skipping Firebase Admin init (non-production).')
          return null
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
