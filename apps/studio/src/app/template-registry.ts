import { TemplateRegistry, defaultTemplateRegistry } from '@progress/sitefinity-nextjs-sdk';

const customTemplateRegistry: TemplateRegistry = {
    // Add custom Next.js page templates here if needed
    // 'MyTemplate': { title: 'My Template', templateFunction: MyTemplate }
};

export const templateRegistry: TemplateRegistry = {
    ...defaultTemplateRegistry,
    ...customTemplateRegistry,
};
