import { ExecutionContext, InternalServerErrorException, createParamDecorator } from "@nestjs/common";


export const GetUser = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        // console.log({ctx});

        const req = ctx.switchToHttp().getRequest();
        const user = req.user;

        if(!user) {
            throw new InternalServerErrorException('User not found (request)');
        }

        if(data) {

            if(!user[data]) {
                
                throw new InternalServerErrorException(`Data not found (${data})`)
            }

            return user[data];
        }
        
        return user;
    }
);
