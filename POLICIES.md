# AWS S3 Bucket Policies

These are the policies that were set up to allow client-side uploading and access of objects.

## Bucket Policy

```json
{
	"Version": "######",
	"Id": "######",
	"Statement": [
		{
			"Sid": "######",
			"Effect": "Allow",
			"Principal": "*",
			"Action": "s3:GetObject",
			"Resource": "arn:aws:s3::: ######"
		}
	]
}
```

## CORS Policy

```json
[
	{
		"AllowedHeaders": ["*"],
		"AllowedMethods": ["GET", "PUT", "HEAD"],
		"AllowedOrigins": [
			"http://127.0.0.1",
			"http://localhost:3000",
			"http://localhost:4000",
			"http://localhost:4500",
			"http://localhost:5000"
		],
		"ExposeHeaders": []
	}
]
```
