import { SignIn } from "@clerk/nextjs";

export const SignInView = () => {
    return ( 
        <div className="min-h-screen h-full min-w-screen flex flex-col items-center justify-center">
            <SignIn routing="hash"/>
        </div>
    );
}
 
