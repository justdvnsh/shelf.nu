import type { ActionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useActionData, useTransition } from "@remix-run/react";
import { parseFormAny, useZorm } from "react-zorm";
import { z } from "zod";
import Input from "~/components/forms/input";

import { useMatchesData } from "~/hooks";
import { updateUser } from "~/modules/user";
import type {
  UpdateUserPayload,
  UpdateUserResponse,
} from "~/modules/user/types";
import type { RootData } from "~/root";

import { assertIsPost, isFormProcessing } from "~/utils";

export const handle = {
  breadcrumb: () => <Link to="/settings">Settings</Link>,
};

export const UpdateFormSchema = z.object({
  id: z.string(),
  email: z
    .string()
    .email("Please enter a valid email.")
    .transform((email) => email.toLowerCase()),
  username: z
    .string()
    .min(4, { message: "Must be at least 4 characters long" }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function action({ request }: ActionArgs) {
  assertIsPost(request);
  const formData = await request.formData();
  const result = await UpdateFormSchema.safeParseAsync(parseFormAny(formData));

  if (!result.success) {
    return json(
      {
        errors: result.error,
      },
      { status: 400 }
    );
  }

  /** Create the payload if the client side validation works */
  const updateUserPayload: UpdateUserPayload = result?.data;

  /** Update the user */
  const updatedUser = await updateUser(updateUserPayload);

  if (updatedUser.errors) {
    return json({ errors: updatedUser.errors }, { status: 400 });
  }

  return updatedUser;
}

export default function UserPage() {
  const zo = useZorm("NewQuestionWizardScreen", UpdateFormSchema);
  const transition = useTransition();
  const disabled = isFormProcessing(transition.state);
  const data = useActionData<UpdateUserResponse>();

  /** Get the data from the action,  */
  let user = useMatchesData<RootData>("root")?.user;

  return (
    <div className="">
      <h2>Settings</h2>
      <Form method="post" ref={zo.ref} className="mt-10">
        <div className="mt-4">
          <label>
            <span>{zo.fields.email()}</span>
            <Input
              className="ml-10"
              type="text"
              name={zo.fields.email()}
              defaultValue={user?.email || undefined}
              error={zo.errors.email()?.message || data?.errors?.email}
            />
          </label>
        </div>
        <div className="mt-4">
          <label>
            <span>{zo.fields.username()}</span>
            <Input
              className="ml-10"
              type="text"
              name={zo.fields.username()}
              defaultValue={user?.username || undefined}
              error={zo.errors.username()?.message || data?.errors?.username}
              // @TODO need to add error for unique username
            />
          </label>
        </div>

        <div className="mt-4">
          <label>
            <span>First name</span>
            <Input
              className="ml-10"
              type="text"
              name={zo.fields.firstName()}
              defaultValue={user?.firstName || undefined}
              error={zo.errors.firstName()?.message}
              // @TODO need to add error for unique username
            />
          </label>
        </div>

        <div className="mt-4">
          <label>
            <span>Last name</span>
            <Input
              className="ml-10"
              type="text"
              name={zo.fields.lastName()}
              defaultValue={user?.lastName || undefined}
              error={zo.errors.lastName()?.message}
              // @TODO need to add error for unique username
            />
          </label>
        </div>

        <input type="hidden" name={zo.fields.id()} defaultValue={user?.id} />

        <div className="mt-4 text-right">
          <button
            className="rounded bg-blue-500  py-2 px-4 text-white focus:bg-blue-400 hover:bg-blue-600"
            disabled={disabled}
          >
            Save
          </button>
        </div>
      </Form>
    </div>
  );
}