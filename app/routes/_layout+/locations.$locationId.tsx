import type { Asset, Category, Tag, Location } from "@prisma/client";
import type { ActionArgs } from "@remix-run/node";
import {
  json,
  redirect,
  type LinksFunction,
  type LoaderArgs,
  type V2_MetaFunction,
} from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import mapCss from "maplibre-gl/dist/maplibre-gl.css";
import { AssetImage } from "~/components/assets/asset-image";
import { ErrorBoundryComponent } from "~/components/errors";
import { ChevronRight } from "~/components/icons";
import ContextualModal from "~/components/layout/contextual-modal";
import Header from "~/components/layout/header";
import type { HeaderData } from "~/components/layout/header/types";
import { Filters } from "~/components/list";
import { List } from "~/components/list/list";
import { ActionsDopdown } from "~/components/location";
import { ShelfMap } from "~/components/location/map";
import { Badge, Button } from "~/components/shared";
import { Card } from "~/components/shared/card";
import { Image } from "~/components/shared/image";
import { Tag as TagBadge } from "~/components/shared/tag";
import { Td, Th } from "~/components/table";
import { commitAuthSession, requireAuthSession } from "~/modules/auth";
import { deleteLocation, getLocation } from "~/modules/location";
import assetCss from "~/styles/asset.css";
import {
  assertIsDelete,
  generatePageMeta,
  getCurrentSearchParams,
  getParamsValues,
  getRequiredParam,
  tw,
} from "~/utils";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { sendNotification } from "~/utils/emitter/send-notification.server";

export const loader = async ({ request, params }: LoaderArgs) => {
  const { userId } = await requireAuthSession(request);
  const id = getRequiredParam(params, "locationId");

  const searchParams = getCurrentSearchParams(request);
  const { page, perPage, search } = getParamsValues(searchParams);

  const { location, totalAssetsWithinLocation } = await getLocation({
    userId,
    id,
    page,
    perPage,
    search,
  });

  if (!location) {
    throw new Response("Not Found", { status: 404 });
  }

  const totalItems = totalAssetsWithinLocation;
  const totalPages = totalAssetsWithinLocation / perPage;
  const { prev, next } = generatePageMeta(request);

  const header: HeaderData = {
    title: location.name,
  };

  const modelName = {
    singular: "asset",
    plural: "assets",
  };

  return json({
    location,
    header,
    modelName,
    items: location.assets,
    page,
    totalItems,
    perPage,
    totalPages,
    next,
    prev,
  });
};

export const meta: V2_MetaFunction<typeof loader> = ({ data }) => [
  { title: appendToMetaTitle(data?.header?.title) },
];

export const handle = {
  breadcrumb: () => "single",
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: mapCss },
  { rel: "stylesheet", href: assetCss },
];

export async function action({ request, params }: ActionArgs) {
  assertIsDelete(request);
  const id = getRequiredParam(params, "locationId");
  const authSession = await requireAuthSession(request);

  await deleteLocation({ id });

  sendNotification({
    title: "Location deleted",
    message: "Your location has been deleted successfully",
    icon: { name: "trash", variant: "error" },
  });

  return redirect(`/locations`, {
    headers: {
      "Set-Cookie": await commitAuthSession(request, { authSession }),
    },
  });
}

export default function LocationPage() {
  const { location } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <div>
      <Header>
        <ActionsDopdown location={location} />
      </Header>
      <ContextualModal />

      <div className="mt-8 block lg:flex">
        <div className="shrink-0 overflow-hidden lg:w-[343px] xl:w-[400px]">
          <Image
            imageId={location?.imageId}
            alt={`${location.name}`}
            className={tw(
              "hidden h-auto w-[343px] rounded-lg border object-cover md:block md:h-[343px] md:w-full xl:h-auto",
              location.description ? "rounded-b-none border-b-0" : ""
            )}
          />
          {location.description ? (
            <Card className=" mt-0 md:rounded-t-none">
              <p className=" text-gray-600">{location.description}</p>
            </Card>
          ) : null}

          {location.address ? (
            <div className="mt-4 flex items-center justify-between gap-10 rounded-lg border border-gray-200 px-4 py-5">
              <span className=" text-xs font-medium text-gray-600">
                Address
              </span>
              <span className="font-medium">{location.address}</span>
            </div>
          ) : null}

          <div className="mb-10 mt-4">
            <ShelfMap latitude={48.858093} longitude={2.294694} />
            <div className="border border-gray-200 p-4 text-center text-text-xs text-gray-600">
              <p>
                <Button
                  to={`https://www.google.com/maps/search/?api=1&query=${48.858093},${2.294694}&zoom=15&markers=${48.858093},${2.294694}`}
                  variant="link"
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                >
                  See in Google Maps
                </Button>
              </p>
            </div>
          </div>
        </div>

        <div className="w-full lg:ml-8">
          <div className="flex flex-col md:gap-2">
            <Filters>
              <div className="flex items-center justify-around gap-6 md:justify-end">
                <div className="hidden gap-6 md:flex">
                  <Button
                    as="button"
                    to="add-assets"
                    variant="primary"
                    icon="plus"
                  >
                    Manage Assets
                  </Button>
                </div>
              </div>
            </Filters>
            <List
              ItemComponent={ListAssetContent}
              navigate={(itemId) => navigate(`/assets/${itemId}`)}
              headerChildren={
                <>
                  <Th>Category</Th>
                  <Th>Tags</Th>
                </>
              }
              customEmptyStateContent={{
                title: "There are currently no assets at the location",
                text: "Add assets in this location",
                newButtonRoute: "add-assets",
                newButtonContent: "Add asset",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const ListAssetContent = ({
  item,
}: {
  item: Asset & {
    category?: Category;
    tags?: Tag[];
    location?: Location;
  };
}) => {
  const { category, tags } = item;
  return (
    <>
      <Td className="w-full p-0 md:p-0">
        <div className="flex justify-between gap-3 p-4 md:justify-normal md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[4px] border">
              <AssetImage
                asset={{
                  assetId: item.id,
                  mainImage: item.mainImage,
                  mainImageExpiration: item.mainImageExpiration,
                  alt: item.title,
                }}
                className="h-10 w-10 rounded-[4px] object-cover"
              />
            </div>
            <div className="flex flex-row items-center gap-2 md:flex-col md:items-start md:gap-0">
              <div className="font-medium">{item.title}</div>
              <div className="hidden text-gray-600 md:block">{item.id}</div>
              <div className="block md:hidden">
                {category ? (
                  <Badge color={category.color}>{category.name}</Badge>
                ) : null}
              </div>
            </div>
          </div>

          <button className="block md:hidden">
            <ChevronRight />
          </button>
        </div>
      </Td>
      <Td>
        {category ? (
          <Badge color={category.color}>{category.name}</Badge>
        ) : null}
      </Td>
      <Td className="text-left">
        <ListItemTagsColumn tags={tags} />
      </Td>
    </>
  );
};

const ListItemTagsColumn = ({ tags }: { tags: Tag[] | undefined }) => {
  const visibleTags = tags?.slice(0, 2);
  const remainingTags = tags?.slice(2);

  return tags && tags?.length > 0 ? (
    <div className="">
      {visibleTags?.map((tag) => (
        <TagBadge key={tag.name} className="mr-2">
          {tag.name}
        </TagBadge>
      ))}
      {remainingTags && remainingTags?.length > 0 ? (
        <TagBadge
          className="mr-2 w-6 text-center"
          title={`${remainingTags?.map((t) => t.name).join(", ")}`}
        >
          {`+${tags.length - 2}`}
        </TagBadge>
      ) : null}
    </div>
  ) : null;
};

export const ErrorBoundary = () => (
  <ErrorBoundryComponent title="Sorry, location you are looking for doesn't exist" />
);