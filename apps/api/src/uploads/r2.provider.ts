import { S3Client } from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";

export const R2_CLIENT = "R2_CLIENT";

export const R2Provider = {
  provide: R2_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): S3Client => {
    const accountId = configService.get<string>("r2.accountId");
    const accessKeyId = configService.get<string>("r2.accessKeyId");
    const secretAccessKey = configService.get<string>("r2.secretAccessKey");

    return new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId || "",
        secretAccessKey: secretAccessKey || "",
      },
    });
  },
};
