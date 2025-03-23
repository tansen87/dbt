import { useForm } from 'react-hook-form';

import Dialog from '@/components/custom/Dialog';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DBType, DialectConfig, useDBListStore } from '@/stores/dbList';
import { DialogProps } from '@radix-ui/react-alert-dialog';
import { useEffect } from 'react';

export function ConfigDialog({
  ctx: db,
  ...props
}: DialogProps & { ctx?: DBType }) {
  const updateDB = useDBListStore((state) => state.setDB);

  const form = useForm<DialectConfig>({
    defaultValues: db?.config,
  });

  useEffect(() => {
    form.reset();
  }, [db?.id]);

  async function handleSubmit(values: DialectConfig) {
    updateDB(values, db!.id);
    props.onOpenChange?.(false);
  }

  const watchDialect = form.watch('dialect');

  return (
    <Dialog
      {...props}
      className="min-w-[800px] min-h-[500px]"
      title={db?.displayName ?? db?.id ?? ''}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col"
        >
          <div className="flex-1 space-y-4">
            <FormField
              control={form.control}
              name="dialect"
              render={({ field }) => (
                <FormItem className="flex items-center w-full">
                  <FormLabel className="w-1/5 mr-2 mt-2 shrink-0">Dialect</FormLabel>
                  <Select
                    disabled
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    {...field}
                  >
                    <FormControl className="flex-grow">
                      <SelectTrigger>
                        <SelectValue placeholder="Select a dialect" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="duckdb">DuckDB</SelectItem>
                      <SelectItem value="folder">Data Folder</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            {watchDialect == 'duckdb' ||
            watchDialect == 'folder' ? (
              <>
                <FormField
                  control={form.control}
                  name="path"
                  render={({ field }) => (
                    <FormItem className="flex items-center w-full">
                      <FormLabel className="w-1/5 mr-2 mt-2 shrink-0">Path</FormLabel>
                      <FormControl className="flex-grow">
                        <Input {...field} className="w-full" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            ) : null}
            {watchDialect == 'duckdb' ? (
              <>
                <FormField
                  control={form.control}
                  name="cwd"
                  render={({ field }) => (
                    <FormItem className="flex items-center w-full">
                      <FormLabel className="w-1/5 mr-2 mt-2 shrink-0">
                        Work Path
                      </FormLabel>
                      <FormControl className="flex-grow">
                        <Input {...field} className="w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : null}
          </div>
        </form>
      </Form>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <Button type="submit" onClick={form.handleSubmit(handleSubmit)}>
          Ok
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
