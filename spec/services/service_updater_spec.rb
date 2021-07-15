RSpec.describe ServiceUpdater do
  subject(:service_updater) { described_class.new(latest_metadata) }
  let(:valid) { true }

  describe '#create_flow' do
    let(:latest_metadata) { metadata_fixture('no_flow_service') }

    before do
      service_updater.create_flow
    end

    context 'creating flow objects from existing pages' do
      let(:service_flow) do
        {
          'cf6dc32f-502c-4215-8c27-1151a45735bb' => {
            '_type' => 'flow.page',
            'next' => {
              'default' => '9e1ba77f-f1e5-42f4-b090-437aa9af7f73'
            }
          },
          '9e1ba77f-f1e5-42f4-b090-437aa9af7f73' => {
            '_type' => 'flow.page',
            'next' => {
              'default' => 'df1ba645-f748-46d0-ad75-f34112653e37'
            }
          },
          'df1ba645-f748-46d0-ad75-f34112653e37' => {
            '_type' => 'flow.page',
            'next' => {
              'default' => '4b8c6bf3-878a-4446-9198-48351b3e2185'
            }
          },
          '4b8c6bf3-878a-4446-9198-48351b3e2185' => {
            '_type' => 'flow.page',
            'next' => {
              'default' => 'e337070b-f636-49a3-a65c-f506675265f0'
            }
          },
          'e337070b-f636-49a3-a65c-f506675265f0' => {
            '_type' => 'flow.page',
            'next' => {
              'default' => '778e364b-9a7f-4829-8eb2-510e08f156a3'
            }
          },
          '778e364b-9a7f-4829-8eb2-510e08f156a3' => {
            '_type' => 'flow.page',
            'next' => {
              'default' => ''
            }
          }
        }
      end

      it 'creates the flow objects in the same order as the pages' do
        page_uuids = latest_metadata['pages'].map { |page| page['_uuid'] }
        flow_uuids = service_updater.latest_metadata['flow'].keys
        expect(page_uuids).to eq(flow_uuids)
      end

      it 'creates the correct flow object structure' do
        expect(service_updater.latest_metadata['flow']).to eq(service_flow)
      end

      it 'creates valid service metadata' do
        expect(
          MetadataPresenter::ValidateSchema.validate(
            service_updater.latest_metadata, 'service.base'
          )
        ).to be(valid)
      end
    end
  end

  describe '#update' do
    let(:service_id) { latest_metadata['service_id'] }
    let(:latest_metadata) { metadata_fixture('no_flow_service') }

    before do
      expect(
        MetadataApiClient::Version
      ).to receive(:create).with(
        service_id: service_id,
        payload: latest_metadata
      ).and_return(version)
    end

    context 'when there are no errors' do
      let(:version) { double(errors?: false, errors: [], metadata: latest_metadata) }

      it 'sends the metadata to the metadata api' do
        service_updater.update
      end
    end

    context 'when there are errors' do
      let(:version) { double(errors?: true, errors: ['some error'], metadata: latest_metadata) }

      it 'return false' do
        expect(service_updater.update).to be_falsey
      end
    end
  end
end
