import { SignUp } from "@clerk/nextjs";

export const SignUpView = () => {
    return ( 
        <div className="min-h-screen h-full min-w-screen flex flex-col items-center justify-center">
            <SignUp routing="hash"/>
        </div>
    );
}