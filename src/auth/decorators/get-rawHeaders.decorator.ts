import { ExecutionContext, InternalServerErrorException, createParamDecorator } from "@nestjs/common";


export const GetRawHeaders = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        // console.log({ctx});

        const req = ctx.switchToHttp().getRequest();
        const rawHeaders = req.rawHeaders;

        if(!rawHeaders) {
            throw new InternalServerErrorException('rawHeaders not found (request)');
        }

        return rawHeaders;
    }
);
