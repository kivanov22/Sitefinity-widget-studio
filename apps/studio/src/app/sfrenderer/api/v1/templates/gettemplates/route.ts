export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
    RestClient,
    RENDERER_NAME,
    PageTemplateCategoryDto,
    PageTemplateCategoryType,
    QueryParamNames,
} from '@progress/sitefinity-nextjs-sdk/rest-sdk';
import { templateRegistry } from '../../../../../template-registry';

export async function GET(request: Request) {
    const parsedUrl = new URL(request.url);

    let selectedPages: string[] = [];
    const selectedItemsParamValue = parsedUrl.searchParams.get('ids');
    if (selectedItemsParamValue) {
        try {
            selectedPages = selectedItemsParamValue.split(',').map((x) => x.trim());
        } catch {
            console.error(`Could not parse selected pages input. Original: ${selectedItemsParamValue}`);
        }
    }

    const additionalHeaders: { [key: string]: string } = {};
    additionalHeaders['host'] = request.headers.get('host') || '';
    RestClient.addAuthHeaders((await cookies()).toString(), additionalHeaders);

    const additionalQueryParams: { [key: string]: string } = {};
    if (parsedUrl.searchParams.has('sf_site')) {
        additionalQueryParams['sf_site'] = parsedUrl.searchParams.get('sf_site') as string;
    }
    if (parsedUrl.searchParams.has(QueryParamNames.Culture)) {
        additionalQueryParams[QueryParamNames.Culture] = parsedUrl.searchParams.get(QueryParamNames.Culture) as string;
    }

    let templates: PageTemplateCategoryDto[] = [];
    const type = parsedUrl.searchParams.get('entitySetName');
    if (type) {
        templates = await RestClient.getTemplates({ type, selectedPages, additionalHeaders, additionalQueryParams });
    }

    const templatesToSkip: string[] = [];
    const reactCategoryIndex = templates.findIndex((x) => x.Title === 'NextJS templates');
    let reactCategory: PageTemplateCategoryDto;

    if (reactCategoryIndex !== -1) {
        reactCategory = templates.splice(reactCategoryIndex, 1)[0];
        reactCategory.Templates.forEach((t) => {
            (t.Framework as unknown) = 'React';
            const exists = Object.keys(templateRegistry).find((x) => `${RENDERER_NAME}.${x}` === t.Name);
            if (exists) templatesToSkip.push(exists);
        });
    } else {
        reactCategory = {
            Subtitle: 'New editor',
            Title: 'NextJS templates',
            Type: PageTemplateCategoryType.None,
            Visible: true,
            Templates: [],
        };
    }

    templates.splice(0, 0, reactCategory);

    const allNewEditorTemplateNames: string[] = [];
    for (const key in templateRegistry) {
        if (!templatesToSkip.includes(key)) {
            reactCategory.Templates.push({
                Framework: 1,
                Id: '00000000-0000-0000-0000-000000000000',
                Name: `${RENDERER_NAME}.${key}`,
                ThumbnailUrl: '/assets/thumbnail-default.png',
                Title: templateRegistry[key].title,
                UsedByNumberOfPages: 0,
                Renderer: 'NextJS',
            });
            allNewEditorTemplateNames.push(key);
        }
    }

    try {
        const stats = await RestClient.getTemplatesStatistics({ templateNames: allNewEditorTemplateNames, additionalHeaders, additionalQueryParams });
        stats.forEach((s) => {
            const t = reactCategory.Templates.find((x) => x.Name === `${RENDERER_NAME}.${s.Name}`);
            if (t) t.UsedByNumberOfPages = s.Count;
        });
    } catch {
        // template statistics may not be available in all SF versions
    }

    let currentlyUsed = templates.find((x) => x.Type === PageTemplateCategoryType.CurrentlyUsed || x.Title === 'Currently used');
    if (currentlyUsed?.Templates.length === 1) {
        currentlyUsed.Templates.forEach((x) => ((x.Framework as unknown) = 'React'));
        const found = reactCategory.Templates.find((x) => x.Title === currentlyUsed!.Templates[0].Title && x.Name === currentlyUsed!.Templates[0].Name);
        if (found) {
            currentlyUsed.Templates[0] = found;
            reactCategory.Templates = reactCategory.Templates.filter((x) => x.Title !== currentlyUsed!.Templates[0].Title);
        }
        const idx = templates.indexOf(currentlyUsed);
        templates.splice(idx, 1);
        templates.splice(0, 0, currentlyUsed);
    }

    templates = templates.filter(
        (x) => x.Type === PageTemplateCategoryType.CurrentlyUsed || x.Templates.some((y) => y.Renderer === 'NextJS') || x.Templates.every((y) => !y.Renderer)
    );

    return NextResponse.json({ value: templates });
}
